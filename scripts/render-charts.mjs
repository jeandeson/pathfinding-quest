// scripts/render-charts.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Regenera figuras/chart_{A,B,C,D}.png a partir de apresentacao/tools/chart.html,
// que lê chart_data.js (derivado de benchmark_results.csv por build_chart_data.mjs).
// Lança Chrome headless e captura cada gráfico via CDP, em alta resolução.
//
// Pré-requisito: rodar antes  node apresentacao/tools/build_chart_data.mjs
// Uso:           node scripts/render-charts.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { spawn }                              from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir }                             from 'node:os';
import { resolve, join, dirname }             from 'node:path';
import { fileURLToPath }                       from 'node:url';
import { setTimeout as sleep }                from 'node:timers/promises';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const CHART_HTML = resolve(ROOT, 'apresentacao/tools/chart.html');
const FILE_URL   = 'file:///' + CHART_HTML.replace(/\\/g, '/');
const OUT_DIR    = resolve(ROOT, 'figuras');
const THEME      = process.env.CHART_THEME || 'dark'; // mesmo tema das figuras originais
const PORT       = 9224;
const CHROME     = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function getWsUrl() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* CDP subindo */ }
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
      return new Promise((res, rej) => { pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    },
  };
}

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'charts-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--force-device-scale-factor=2',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });

  let ws;
  try {
    const wsUrl = await getWsUrl();
    ws = new WebSocket(wsUrl);
    await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
    const cdp = cdpClient(ws);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 2, mobile: false });

    for (const id of ['A', 'B', 'C', 'D']) {
      await cdp.send('Page.navigate', { url: `${FILE_URL}?id=${id}&theme=${THEME}` });
      await sleep(1200); // Chart.js layout + fontes
      const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const buf = Buffer.from(r.data, 'base64');
      writeFileSync(join(OUT_DIR, `chart_${id}.png`), buf);
      console.error(`✓ figuras/chart_${id}.png (${buf.length} bytes)`);
    }
  } finally {
    try { if (ws) ws.close(); } catch { /* ignore */ }
    try { chrome.kill(); } catch { /* ignore */ }
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
