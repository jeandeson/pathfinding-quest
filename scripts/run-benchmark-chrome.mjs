// scripts/run-benchmark-chrome.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Roda o BenchmarkRunner em Chrome headless (motor V8/Blink real) via Chrome
// DevTools Protocol (CDP), medindo no ambiente de NAVEGADOR documentado na
// metodologia — e não em Node. Requer o servidor de desenvolvimento do Vite
// ativo em http://localhost:5173 (npm run dev / npx vite).
//
// A página /benchmark.html roda o benchmark isolado do loop de jogo e expõe o
// resultado em window.__BENCH_CSV__. Este script lança o Chrome, aguarda a
// conclusão e grava o CSV em UTF-8.
//
// Uso: node scripts/run-benchmark-chrome.mjs [saida.csv]
// ─────────────────────────────────────────────────────────────────────────────

import { spawn }                            from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir }                           from 'node:os';
import { resolve, join }                    from 'node:path';
import { setTimeout as sleep }              from 'node:timers/promises';

const OUT    = resolve(process.argv[2] || 'benchmark_results.csv');
const PORT   = 9223;
const VITE   = 'http://localhost:5173';
const URL    = `${VITE}/benchmark.html`;
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function waitVite() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(URL); if (r.ok) return; } catch { /* ainda subindo */ }
    await sleep(500);
  }
  throw new Error('Servidor Vite não respondeu em ' + URL);
}

async function getWsUrl() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page' && t.url.includes('benchmark.html'))
                || list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* CDP ainda subindo */ }
    await sleep(500);
  }
  throw new Error('Alvo de página (CDP) não encontrado no Chrome.');
}

function cdpClient(ws) {
  let id = 1; const pending = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id != null && pending.has(m.id)) {
      const cb = pending.get(m.id); pending.delete(m.id);
      m.error ? cb.rej(new Error(JSON.stringify(m.error))) : cb.res(m.result);
    }
  });
  return {
    send(method, params = {}) {
      const i = id++;
      return new Promise((res, rej) => {
        pending.set(i, { res, rej });
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    },
  };
}

async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function main() {
  await waitVite();
  console.error('Vite OK. Lançando Chrome headless…');

  const profile = mkdtempSync(join(tmpdir(), 'bench-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, URL,
  ], { stdio: 'ignore' });

  let ws;
  try {
    const wsUrl = await getWsUrl();
    ws = new WebSocket(wsUrl);
    await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
    const cdp = cdpClient(ws);
    await cdp.send('Runtime.enable');

    let lastProg = '';
    const startedAt = Date.now();
    for (;;) {
      const done = await evalJS(cdp, 'window.__BENCH_DONE__ === true');
      const prog = await evalJS(cdp, 'String(window.__BENCH_PROGRESS__ || "")');
      if (prog && prog !== lastProg) { console.error('  ' + prog); lastProg = prog; }
      if (done) break;
      if (Date.now() - startedAt > 25 * 60 * 1000) throw new Error('timeout (25 min)');
      await sleep(1000);
    }

    const err = await evalJS(cdp, 'String(window.__BENCH_ERR__ || "")');
    if (err) throw new Error('Benchmark falhou na página: ' + err);
    const csv = await evalJS(cdp, 'window.__BENCH_CSV__');
    if (!csv || typeof csv !== 'string') throw new Error('CSV vazio retornado pela página.');

    writeFileSync(OUT, csv + '\n', 'utf8');
    console.error(`\n✓ CSV escrito em ${OUT} (${csv.split(/\r?\n/).length} linhas)`);
  } finally {
    try { if (ws) ws.close(); } catch { /* ignore */ }
    try { chrome.kill(); } catch { /* ignore */ }
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
