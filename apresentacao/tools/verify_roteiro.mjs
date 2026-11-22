// verify_roteiro.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Confere o ROTEIRO_DE_APRESENTACAO.md contra o deck gerado (deck_index.json,
// escrito por build_from_template.ps1). Um número de slide errado no roteiro faz
// o apresentador abrir o slide errado na frente da banca; aqui isso vira falha.
//
//   1. tabela de tempos: um slide por linha, na ordem do deck, títulos iguais;
//   2. coluna "Acumulado" = soma das durações;
//   3. cabeçalhos "### Slide N — Título (m:ss)": mesmo título e mesma duração;
//   4. pontos de controle (lista e marcas "[controle: m:ss]") = acumulado do slide;
//   5. toda referência "N · Título" aponta para o slide com esse título;
//   6. todo "slide de apoio N" cai em um slide de apoio (também no roteiro de estudo);
//   7. o tempo no início das anotações de cada slide = duração da tabela.
//
// Uso: node verify_roteiro.mjs   (sai com código 1 se algo divergir)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APRES = resolve(__dirname, '..');
const read = (p) => readFileSync(p, 'utf8').replace(/^﻿/, '');

const deck = JSON.parse(read(resolve(__dirname, 'deck_index.json')));
const byN = new Map(deck.map(d => [d.n, d]));
const lastMain = deck.find(d => d.title === 'Obrigado').n;
const firstBackup = deck.find(d => d.title === 'Slides de apoio').n + 1;
const lastSlide = deck[deck.length - 1].n;

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };
const secs = (s) => { const m = /(\d+):(\d\d)/.exec(s); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
const clean = (s) => s.replace(/\\\*/g, '*').replace(/\*\*/g, '').trim();

/** O título usado no roteiro corresponde ao título do slide N? */
function sameTitle(n, text) {
  const d = byN.get(n);
  if (!d) return false;
  const t = clean(text);
  const sec = /^Seção (\d\d)$/.exec(d.title);
  if (sec) return t.startsWith(`Divisória ${sec[1]}`);
  return t === d.title || t.startsWith(d.title + ' ') || t.startsWith(d.title + ':');
}

const md = read(resolve(APRES, 'ROTEIRO_DE_APRESENTACAO.md')).split(/\r?\n/);

// 1–2. tabela de tempos
const rows = [];
for (const l of md) {
  const m = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(\d+:\d\d)\s*\|\s*([^|]+?)\s*\|/.exec(l);
  if (m) rows.push({ n: Number(m[1]), title: m[2], dur: secs(m[3]), acc: secs(m[4]) });
}
ok(rows.length === lastMain, `tabela de tempos tem ${rows.length} linhas; o deck tem ${lastMain} slides principais`);
let sum = 0;
const dur = new Map(), acc = new Map();
rows.forEach((r, i) => {
  ok(r.n === i + 1, `tabela de tempos: linha ${i + 1} traz o slide ${r.n}`);
  ok(sameTitle(r.n, r.title), `tabela de tempos: slide ${r.n} é "${byN.get(r.n)?.title}", o roteiro diz "${clean(r.title)}"`);
  sum += r.dur;
  ok(r.acc === sum, `tabela de tempos: acumulado do slide ${r.n} deveria ser ${mmss(sum)}, está ${mmss(r.acc)}`);
  dur.set(r.n, r.dur); acc.set(r.n, sum);
});

// 3–4. cabeçalhos e marcas de controle
let cur = 0, headers = 0;
for (const l of md) {
  const h = /^### Slide (\d+) — (.+?) \((\d+:\d\d)\)\s*$/.exec(l);
  if (h) {
    cur = Number(h[1]); headers++;
    ok(sameTitle(cur, h[2]), `cabeçalho: slide ${cur} é "${byN.get(cur)?.title}", o roteiro diz "${clean(h[2])}"`);
    ok(secs(h[3]) === dur.get(cur), `cabeçalho do slide ${cur}: ${h[3]}, mas a tabela diz ${mmss(dur.get(cur) ?? 0)}`);
    continue;
  }
  if (/^## /.test(l)) cur = 0;
  const c = /\[controle: (\d+:\d\d)\]/.exec(l);
  if (c && cur) ok(secs(c[1]) === acc.get(cur), `marca de controle no slide ${cur}: ${c[1]}, mas o acumulado é ${mmss(acc.get(cur) ?? 0)}`);
  const p = /^- fim d[aeo]s? .*\(slide (\d+)\): \*\*(\d+:\d\d)\*\*/.exec(l);
  if (p) ok(secs(p[2]) === acc.get(Number(p[1])), `ponto de controle do slide ${p[1]}: ${p[2]}, mas o acumulado é ${mmss(acc.get(Number(p[1])) ?? 0)}`);
}
ok(headers === lastMain, `"3. Slide a slide" tem ${headers} cabeçalhos; o deck tem ${lastMain} slides principais`);
for (const l of md) { const m = /O plano é de (\d+:\d\d)/.exec(l); if (m) ok(secs(m[1]) === sum, `"O plano é de ${m[1]}", mas a tabela soma ${mmss(sum)}`); }

// 5. referências "N · Título"
for (const [i, l] of md.entries()) {
  for (const m of l.matchAll(/(\d+) · (.+?)(?= e \d+ · |\*\*|\s*\||$)/g)) {
    const n = Number(m[1]), d = byN.get(n);
    ok(d && clean(m[2]) === d.title, `linha ${i + 1}: "${m[1]} · ${clean(m[2])}", mas o slide ${n} é "${d?.title}"`);
  }
}

// 6. "slide(s) de apoio N" (roteiro de apresentação e de estudo)
for (const name of ['ROTEIRO_DE_APRESENTACAO.md', 'ROTEIRO_DE_ESTUDO.md']) {
  for (const [i, l] of read(resolve(APRES, name)).split(/\r?\n/).entries()) {
    for (const m of l.matchAll(/slides? de apoio (\d+)/g)) {
      const n = Number(m[1]);
      ok(n >= firstBackup && n <= lastSlide, `${name}, linha ${i + 1}: "slide de apoio ${n}" não é um slide de apoio (${firstBackup}–${lastSlide})`);
    }
  }
}

// 7. tempo nas anotações do orador
for (const d of deck.filter(x => x.n <= lastMain)) {
  const m = /^\[(\d+:\d\d)/.exec(d.notes || '');
  ok(m && secs(m[1]) === dur.get(d.n), `anotações do slide ${d.n} (${d.title}): começam com "${(d.notes || '').slice(0, 12)}", a tabela diz ${mmss(dur.get(d.n) ?? 0)}`);
}

console.log(`\n=== verify_roteiro: ${checks} conferências · ${fails.length} divergência(s) · total planejado ${mmss(sum)} ===`);
if (fails.length) { for (const f of fails) console.log('  x ' + f); process.exit(1); }
console.log(`OK: roteiro e deck batem (slides 1–${lastMain} na fala; apoio em ${firstBackup}–${lastSlide}).`);
