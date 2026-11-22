// registrar_ensaios.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Passa para o roteiro os ensaios cronometrados feitos na página ensaio.html.
// A página salva cada ensaio como ensaio_tcc_AAAA-MM-DD_HHMMSS.csv na pasta de
// downloads. Este script:
//   1. copia os CSV para apresentacao/ensaio/realizados/ (o registro fica no repositório);
//   2. preenche a ficha de ensaios do ROTEIRO_DE_APRESENTACAO.md (entre os marcadores
//      "ensaios:inicio" e "ensaios:fim"), mantendo o que você escreveu em "Ajuste";
//   3. regenera os .docx dos roteiros.
// Ensaios com menos de 5 minutos são tratados como teste da página e ficam de fora.
//
// Uso: node registrar_ensaios.mjs [pasta-dos-csv]      (padrão: sua pasta Downloads)
//      node registrar_ensaios.mjs --min 480            (muda o mínimo, em segundos)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APRES = resolve(__dirname, '..');
const KEEP = resolve(APRES, 'ensaio', 'realizados');
const MD = resolve(APRES, 'ROTEIRO_DE_APRESENTACAO.md');

const args = process.argv.slice(2);
const iMin = args.indexOf('--min');
const MIN_S = iMin >= 0 ? Number(args[iMin + 1]) : 300;
const DRY = args.includes('--simular');                    // só mostra o que faria; não copia nem grava nada
const src = args.find((a, i) => !a.startsWith('--') && (iMin < 0 || i !== iMin + 1)) || join(homedir(), 'Downloads');
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

/** Lê um CSV da página de ensaio. Devolve null se o arquivo não for um deles. */
function parse(path) {
  const lines = readFileSync(path, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const head = (lines[0] || '').split(';');
  if (head[0] !== 'ensaio_tcc' || head[2] !== 'inicio') return null;
  const rows = lines.slice(2).map(l => { const m = /^(\d+);"((?:[^"]|"")*)";(\d+);(-?\d+);(-?\d+)$/.exec(l); return m && { n: +m[1], title: m[2].replace(/""/g, '"'), plan: +m[3], real: +m[4] }; }).filter(Boolean);
  if (!rows.length) return null;
  return { start: head[3], total: rows.reduce((a, r) => a + r.real, 0), plan: Number(head[7]), rows, over: rows.filter(r => r.real > r.plan).map(r => r.n) };
}

if (!DRY) mkdirSync(KEEP, { recursive: true });

// 1. traz os CSV novos da pasta de downloads
let copied = 0, tests = 0;
const fresh = [];
if (existsSync(src)) {
  for (const f of readdirSync(src).filter(f => /^ensaio_tcc_.*\.csv$/i.test(f))) {
    const e = parse(join(src, f));
    if (!e) continue;
    if (e.total < MIN_S) { tests++; continue; }
    const name = `ensaio_tcc_${e.start.replace(/[-:]/g, '').replace('T', '_')}.csv`;        // um arquivo por horário de início
    if (existsSync(join(KEEP, name))) continue;
    copied++;
    if (DRY) fresh.push(e); else copyFileSync(join(src, f), join(KEEP, name));
  }
} else console.log(`(pasta ${src} não existe; uso só o que já está em ensaio/realizados)`);

// 2. ficha do roteiro
const kept = existsSync(KEEP) ? readdirSync(KEEP).filter(f => f.endsWith('.csv')).map(f => parse(join(KEEP, f))).filter(Boolean) : [];
const done = [...kept, ...fresh].sort((a, b) => a.start.localeCompare(b.start));
let md = readFileSync(MD, 'utf8');
const NL = md.includes('\r\n') ? '\r\n' : '\n';
const re = /(<!-- ensaios:inicio -->)([\s\S]*?)(<!-- ensaios:fim -->)/;
const block = re.exec(md);
if (!block) { console.error('x não achei os marcadores "ensaios:inicio" / "ensaios:fim" no roteiro.'); process.exit(1); }
// preserva a coluna "Ajuste" já escrita, linha a linha
const notes = block[2].split(/\r?\n/).filter(l => /^\|\s*\d+º/.test(l)).map(l => l.split('|').slice(1, -1).map(c => c.trim())[4] || '');
const n = Math.max(3, done.length);
const lines = ['', '| Ensaio | Data | Tempo total | Slides acima da meta | Ajuste |', '|---|---|---|---|---|'];
for (let k = 0; k < n; k++) {
  const e = done[k];
  if (!e) { lines.push(`| ${k + 1}º | | | | ${notes[k] || ''} |`); continue; }
  const [d, t] = e.start.split('T'), [y, m, dd] = d.split('-');
  // "min" e "s" por extenso: os outros scripts leem toda linha "| n | ... | m:ss |" como linha da tabela de tempos
  lines.push(`| ${k + 1}º | ${dd}/${m}/${y}, ${t.slice(0, 5)} | ${Math.floor(e.total / 60)} min ${String(e.total % 60).padStart(2, '0')} s | ${e.over.length ? e.over.join(', ') : 'nenhum'} | ${notes[k] || ''} |`);
}
lines.push('', '');
if (DRY) { console.log('(simulação: nada foi copiado nem gravado)' + lines.join('\n')); }
else { md = md.replace(re, (_, a, _b, c) => a + lines.join(NL) + c); writeFileSync(MD, md); }

console.log(`${copied} ensaio(s) novo(s) trazido(s) de ${src}${tests ? `; ${tests} teste(s) com menos de ${fmt(MIN_S)} ignorado(s)` : ''}.`);
if (!done.length) console.log('Nenhum ensaio completo registrado ainda. A ficha do roteiro continua em branco.');
for (const [k, e] of done.entries()) console.log(`  ${k + 1}º  ${e.start.replace('T', ' ')}  total ${fmt(e.total)} (plano ${fmt(e.plan)})  acima da meta: ${e.over.length ? e.over.join(', ') : 'nenhum'}`);

// 3. roteiros em .docx
if (done.length && !DRY) {
  execFileSync(process.execPath, [resolve(__dirname, 'roteiros_docx.mjs')], { stdio: 'inherit' });
  console.log(`Ficha atualizada: ${done.length} de 3 ensaios.${done.length >= 3 ? ' Ensaio cronometrado concluído.' : ''}`);
}
