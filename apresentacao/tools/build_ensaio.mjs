// build_ensaio.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Gera apresentacao/ensaio/ensaio.html: a página do ENSAIO CRONOMETRADO pedido na
// devolutiva. Para cada slide principal ela mostra a imagem do slide, a fala do
// roteiro, o cronômetro do slide (com a meta) e o cronômetro total. Ao final,
// compara planejado × realizado e guarda cada ensaio no navegador.
//
// Fontes: ROTEIRO_DE_APRESENTACAO.md (tempos e falas), deck_index.json (ordem) e
// apresentacao/preview/slide_NN.png (imagens; a página as referencia por caminho
// relativo, então basta abrir o .html com dois cliques).
//
// Uso: node build_ensaio.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APRES = resolve(__dirname, '..');
const read = (p) => readFileSync(p, 'utf8').replace(/^﻿/, '');

const deck = JSON.parse(read(resolve(__dirname, 'deck_index.json')));
const lastMain = deck.find(d => d.title === 'Obrigado').n;
const md = read(resolve(APRES, 'ROTEIRO_DE_APRESENTACAO.md')).split(/\r?\n/);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s.replace(/\\\*/g, '*')).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

const plan = new Map(), name = new Map();
for (const l of md) {
  const m = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(\d+):(\d\d)\s*\|/.exec(l);
  if (m) { plan.set(Number(m[1]), Number(m[3]) * 60 + Number(m[4])); name.set(Number(m[1]), m[2].replace(/\\\*/g, '*').trim()); }
}

// fala (citações) e instruções (demais linhas) de cada "### Slide N"
const speech = new Map(), cues = new Map();
let cur = 0;
for (const l of md) {
  const h = /^### Slide (\d+)/.exec(l);
  if (h) { cur = Number(h[1]); speech.set(cur, []); cues.set(cur, []); continue; }
  if (/^## |^---/.test(l)) { cur = 0; continue; }
  if (!cur || !l.trim()) continue;
  const q = /^>\s?(.*)$/.exec(l);
  if (q) { if (q[1].trim()) (/^\*\*Plano B/.test(q[1]) ? cues : speech).get(cur).push(inline(q[1])); }
  else cues.get(cur).push(inline(l.replace(/^\d+\.\s/, m => m)));
}

const slides = [];
for (let n = 1; n <= lastMain; n++) {
  if (!plan.has(n)) throw new Error(`slide ${n} sem tempo planejado no roteiro`);
  const img = `slide_${String(n).padStart(2, '0')}.png`;
  if (!existsSync(resolve(APRES, 'preview', img))) throw new Error(`falta apresentacao/preview/${img} (rode export_previews.ps1)`);
  slides.push({ n, title: name.get(n), plan: plan.get(n), img: `../preview/${img}`, speech: speech.get(n) || [], cues: cues.get(n) || [] });
}
const total = slides.reduce((a, s) => a + s.plan, 0);

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ensaio cronometrado</title>
<style>
  :root {
    --bg: #f6f4fa; --panel: #ffffff; --ink: #1e143c; --muted: #5a5078; --line: #ddd8ea;
    --accent: #b00d62; --ok: #167a3e; --warn: #a25a00; --over: #c42c48; --okbg: #e5f4eb; --warnbg: #fdf0d9; --overbg: #fcebee;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #17122a; --panel: #211a3a; --ink: #f1eefa; --muted: #b3aacd; --line: #3a3160;
      --accent: #ff7ab8; --ok: #6fd69a; --warn: #f2b65c; --over: #ff8d9f; --okbg: #173524; --warnbg: #3a2c12; --overbg: #40181f;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 "Segoe UI", system-ui, sans-serif; }
  header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 28px; padding: 12px 20px; background: var(--panel); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 2; }
  h1 { font-size: 18px; margin: 0; }
  .clock { display: flex; align-items: baseline; gap: 8px; font-variant-numeric: tabular-nums; }
  .clock b { font-size: 34px; line-height: 1; }
  .clock small { color: var(--muted); }
  .state-ok b { color: var(--ok); } .state-warn b { color: var(--warn); } .state-over b { color: var(--over); }
  .bar { flex: 1 1 200px; height: 10px; background: var(--line); border-radius: 5px; overflow: hidden; min-width: 160px; }
  .bar i { display: block; height: 100%; width: 0; background: var(--accent); }
  main { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 20px; padding: 20px; max-width: 1500px; margin: 0 auto; }
  @media (max-width: 900px) { main { grid-template-columns: 1fr; } }
  .slide img { width: 100%; display: block; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
  .slide h2 { font-size: 20px; margin: 0 0 10px; }
  .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px 18px; }
  .speech p { font-size: 21px; line-height: 1.5; margin: 0 0 14px; text-wrap: pretty; }
  .cues { color: var(--muted); font-size: 15px; margin-top: 8px; }
  .cues p { margin: 0 0 6px; }
  .keys { color: var(--muted); font-size: 14px; }
  kbd { border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 4px; padding: 1px 6px; background: var(--bg); font: 13px Consolas, monospace; }
  button { font: inherit; color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 8px 14px; cursor: pointer; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) button.primary { color: #17122a; } }
  button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .tablewrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th { color: var(--muted); font-weight: 600; font-size: 14px; }
  td.num, th.num { text-align: right; }
  tr.over td { background: var(--overbg); } tr.warn td { background: var(--warnbg); }
  .tag { display: inline-block; border-radius: 4px; padding: 0 7px; font-size: 13px; font-weight: 600; }
  .tag.ok { background: var(--okbg); color: var(--ok); } .tag.warn { background: var(--warnbg); color: var(--warn); } .tag.over { background: var(--overbg); color: var(--over); }
  #end, #start { max-width: 1000px; margin: 20px auto; padding: 0 20px; }
  .hidden { display: none !important; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 14px 0; }
</style>
</head>
<body>
<header>
  <h1>Ensaio cronometrado</h1>
  <div class="clock" id="cSlide"><small>slide</small><b>0:00</b><small id="cPlan"></small></div>
  <div class="clock" id="cTotal"><small>total</small><b>0:00</b><small>de ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}</small></div>
  <div class="bar" aria-hidden="true"><i id="prog"></i></div>
  <span class="keys"><kbd>Espaço</kbd> avança · <kbd>←</kbd> volta · <kbd>P</kbd> pausa</span>
</header>

<section id="start">
  <div class="panel">
    <h2>Antes de começar</h2>
    <p>Fique em pé, fale em voz alta e use o simulador de verdade no slide 12. A página cronometra cada slide e o total; no fim, mostra onde você passou do planejado e guarda o resultado.</p>
    <p>As frases em destaque são a fala do roteiro. Não leia: olhe, fale com as suas palavras e avance com <kbd>Espaço</kbd>.</p>
    <div class="row"><button class="primary" id="go">Começar o ensaio</button><span class="keys">ou aperte <kbd>Espaço</kbd></span></div>
  </div>
  <div class="panel" style="margin-top:16px" id="histBox"></div>
</section>

<main id="stage" class="hidden">
  <div class="slide">
    <h2 id="sTitle"></h2>
    <img id="sImg" alt="">
  </div>
  <div>
    <div class="panel speech" id="sSpeech"></div>
    <div class="cues" id="sCues"></div>
    <div class="row"><button id="prev">← Voltar</button><button id="pause">Pausar</button><button class="primary" id="next">Avançar</button></div>
  </div>
</main>

<section id="end" class="hidden">
  <div class="panel">
    <h2 id="eTitle"></h2>
    <p id="eSummary"></p>
    <div class="tablewrap"><table id="eTable"></table></div>
    <div class="row"><button class="primary" id="again">Ensaiar de novo</button><button id="csv">Salvar o CSV de novo</button></div>
  </div>
  <div class="panel" style="margin-top:16px" id="histBox2"></div>
</section>

<script>
const SLIDES = ${JSON.stringify(slides)};
const TOTAL = ${total};
const KEY = 'tcc-ensaios-v1';
const $ = (id) => document.getElementById(id);
const fmt = (s) => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const now = () => performance.now() / 1000;

let i = 0, spent = [], t0 = 0, running = false, timer = null, startedAt = null;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }

function current() { return spent[i] + (running ? now() - t0 : 0); }
function totalNow() { return spent.reduce((a, b) => a + b, 0) + (running ? now() - t0 : 0); }
function stateOf(used, plan) { return used > plan * 1.25 + 3 ? 'over' : used > plan ? 'warn' : 'ok'; }

function tick() {
  const s = SLIDES[i], used = current(), tot = totalNow();
  $('cSlide').className = 'clock state-' + stateOf(used, s.plan);
  $('cSlide').querySelector('b').textContent = fmt(used);
  $('cTotal').className = 'clock state-' + stateOf(tot, TOTAL);
  $('cTotal').querySelector('b').textContent = fmt(tot);
  $('prog').style.width = Math.min(100, tot / TOTAL * 100) + '%';
}

function show() {
  const s = SLIDES[i];
  $('sTitle').textContent = 'Slide ' + s.n + ' de ' + SLIDES.length + ' — ' + s.title;
  $('sImg').src = s.img; $('sImg').alt = 'Slide ' + s.n + ': ' + s.title;
  $('cPlan').textContent = 'de ' + fmt(s.plan);
  $('sSpeech').innerHTML = s.speech.length ? s.speech.map(p => '<p>' + p + '</p>').join('') : '<p>(sem fala fixa: siga as instruções abaixo)</p>';
  $('sCues').innerHTML = s.cues.map(p => '<p>' + p + '</p>').join('');
  $('next').textContent = i === SLIDES.length - 1 ? 'Terminar' : 'Avançar';
  tick();
}

function start() {
  i = 0; spent = SLIDES.map(() => 0); running = true; t0 = now(); startedAt = new Date();
  $('start').classList.add('hidden'); $('end').classList.add('hidden'); $('stage').classList.remove('hidden');
  $('pause').textContent = 'Pausar';
  clearInterval(timer); timer = setInterval(tick, 200);
  show();
}
function bank() { if (running) { spent[i] += now() - t0; t0 = now(); } }
function next() { bank(); if (i < SLIDES.length - 1) { i++; show(); } else finish(); }
function prev() { bank(); if (i > 0) { i--; show(); } }
function pause() { if (running) { bank(); running = false; } else { running = true; t0 = now(); } $('pause').textContent = running ? 'Pausar' : 'Continuar'; tick(); }

function finish() {
  bank(); running = false; clearInterval(timer);
  const tot = spent.reduce((a, b) => a + b, 0);
  const over = SLIDES.filter((s, k) => spent[k] > s.plan).map(s => s.n);
  const list = load();
  list.push({ when: new Date().toISOString(), total: Math.round(tot), spent: spent.map(x => Math.round(x)), over });
  const kept = save(list);
  $('stage').classList.add('hidden'); $('end').classList.remove('hidden');
  $('eTitle').textContent = 'Ensaio ' + list.length + ': ' + fmt(tot) + ' (planejado ' + fmt(TOTAL) + ')';
  const diff = tot - TOTAL;
  $('eSummary').textContent = (tot <= 15 * 60 ? 'Cabe em 15 minutos. ' : tot <= 20 * 60 ? 'Passa de 15 minutos, mas cabe em 20. ' : 'Passa de 20 minutos: precisa cortar. ')
    + (Math.abs(diff) < 5 ? 'No tempo planejado.' : diff > 0 ? fmt(diff) + ' acima do planejado.' : fmt(-diff) + ' abaixo do planejado.')
    + (over.length ? ' Acima da meta nos slides: ' + over.join(', ') + '.' : ' Nenhum slide passou da meta.')
    + (kept ? '' : ' (O navegador não deixou guardar o histórico.)')
    + ' O resultado foi salvo na sua pasta de downloads como ' + csv() + '.';
  $('eTable').innerHTML = '<tr><th>Slide</th><th>Título</th><th class="num">Planejado</th><th class="num">Realizado</th><th class="num">Diferença</th><th></th></tr>'
    + SLIDES.map((s, k) => { const d = spent[k] - s.plan, st = stateOf(spent[k], s.plan);
        return '<tr class="' + (st === 'ok' ? '' : st) + '"><td>' + s.n + '</td><td>' + s.title + '</td><td class="num">' + fmt(s.plan) + '</td><td class="num">' + fmt(spent[k]) + '</td><td class="num">' + (d >= 0 ? '+' : '−') + fmt(Math.abs(d)) + '</td><td><span class="tag ' + st + '">' + (st === 'ok' ? 'dentro' : st === 'warn' ? 'acima' : 'bem acima') + '</span></td></tr>'; }).join('')
    + '<tr><th></th><th>Total</th><th class="num">' + fmt(TOTAL) + '</th><th class="num">' + fmt(tot) + '</th><th class="num">' + (diff >= 0 ? '+' : '−') + fmt(Math.abs(diff)) + '</th><th></th></tr>';
  history();
  window.scrollTo(0, 0);
}

function history() {
  const list = load();
  const html = '<h2>Ensaios guardados neste navegador</h2>' + (list.length
    ? '<div class="tablewrap"><table><tr><th>Ensaio</th><th>Data</th><th class="num">Tempo total</th><th>Slides acima da meta</th></tr>'
      + list.map((e, k) => '<tr><td>' + (k + 1) + '</td><td>' + new Date(e.when).toLocaleString('pt-BR') + '</td><td class="num">' + fmt(e.total) + '</td><td>' + (e.over.length ? e.over.join(', ') : 'nenhum') + '</td></tr>').join('')
      + '</table></div><p class="keys">Cada ensaio também é salvo na pasta de downloads (ensaio_tcc_….csv). Para passar os resultados à ficha do roteiro, rode <code>node registrar_ensaios.mjs</code> em apresentacao/tools. A devolutiva pede o ensaio cronometrado; o combinado são três.</p><div class="row"><button id="clear">Apagar o histórico</button></div>'
    : '<p class="keys">Nenhum ensaio ainda. Ao terminar o primeiro, ele aparece aqui.</p>');
  for (const id of ['histBox', 'histBox2']) $(id).innerHTML = html;
  document.querySelectorAll('#clear').forEach(b => b.onclick = () => { if (confirm('Apagar todos os ensaios guardados?')) { save([]); history(); } });
}

// Salva o ensaio como CSV (primeira linha: quando começou, total e plano). registrar_ensaios.mjs lê esse arquivo.
function csv() {
  const d = startedAt || new Date(), two = (v) => String(v).padStart(2, '0');
  const day = d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()), hms = two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
  const tot = Math.round(spent.reduce((a, b) => a + b, 0));
  const rows = [['ensaio_tcc', 'v1', 'inicio', day + 'T' + hms, 'total_s', tot, 'planejado_s', TOTAL], ['slide', 'titulo', 'planejado_s', 'realizado_s', 'diferenca_s']]
    .concat(SLIDES.map((s, k) => [s.n, '"' + s.title.replace(/"/g, '""') + '"', s.plan, Math.round(spent[k]), Math.round(spent[k] - s.plan)]));
  const blob = new Blob(['\\uFEFF' + rows.map(r => r.join(';')).join('\\r\\n')], { type: 'text/csv' });
  const name = 'ensaio_tcc_' + day + '_' + hms.replace(/:/g, '') + '.csv';
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  return name;
}

$('go').onclick = start; $('again').onclick = start; $('next').onclick = next; $('prev').onclick = prev; $('pause').onclick = pause; $('csv').onclick = csv;
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;      // o botão focado já trata a tecla
  const staged = !$('stage').classList.contains('hidden');
  if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); staged ? next() : ($('start').classList.contains('hidden') ? null : start()); }
  else if (staged && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); prev(); }
  else if (staged && (e.key === 'p' || e.key === 'P')) pause();
});
history();
</script>
</body>
</html>
`;

const out = resolve(APRES, 'ensaio');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'ensaio.html'), html);
console.log(`✓ ensaio/ensaio.html: ${slides.length} slides, plano de ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`);
