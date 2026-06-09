// Focused benchmark capture — runs the benchmark and captures each tab.

import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';

const HOST = '127.0.0.1', PORT = 9222;
const URL = 'http://localhost:5173/';
const OUT = resolve('../assets');

async function getTarget() {
  const r = await fetch(`http://${HOST}:${PORT}/json/list`);
  const list = await r.json();
  return list.find(t => t.type === 'page' && !t.url.startsWith('devtools://'));
}

function makeClient(ws) {
  let id = 1; const pending = new Map(), handlers = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id != null) { const cb = pending.get(m.id); if (cb) { pending.delete(m.id); m.error ? cb.rej(m.error) : cb.res(m.result); } }
    else if (m.method && handlers.has(m.method)) handlers.get(m.method)(m.params);
  });
  return {
    send(method, params = {}) { const i = id++; return new Promise((res, rej) => { pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }); },
    on(method, h) { handlers.set(method, h); },
  };
}

async function connect() {
  const t = await getTarget();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  return makeClient(ws);
}

async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log(`  → ${name}.png`);
}

async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: `(${expr})()`, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function getRect(cdp) {
  return evalJS(cdp, `() => { const c = document.getElementById('gameCanvas'); const r = c.getBoundingClientRect(); return { x:r.left, y:r.top, width:r.width, height:r.height, cw:c.width, ch:c.height }; }`);
}

async function clickC(cdp, rect, cx, cy) {
  const vx = rect.x + cx * (rect.width / rect.cw);
  const vy = rect.y + cy * (rect.height / rect.ch);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: vx, y: vy });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: vx, y: vy, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: vx, y: vy, button: 'left', clickCount: 1 });
  console.log(`  click canvas(${cx},${cy})`);
}

async function nav(cdp, url) {
  await cdp.send('Page.enable');
  const p = new Promise(r => cdp.on('Page.loadEventFired', r));
  await cdp.send('Page.navigate', { url });
  await p;
  await sleep(1500);
}

async function main() {
  const cdp = await connect();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await nav(cdp, URL);

  let rect = await getRect(cdp);

  // Click "Executar Benchmark" in menu
  await clickC(cdp, rect, 640, 300);
  await sleep(1500);
  rect = await getRect(cdp);
  await shot(cdp, 'bench_00_intro');

  // Click "▶ Executar Testes" — canvas (530, 922)
  await clickC(cdp, rect, 530, 922);
  console.log('  benchmark running...');
  await sleep(8000);
  await shot(cdp, 'bench_01_density');  // tab 1 (default)

  // Switch to tab 2 — Escalabilidade — cx = 152 + 1*244 = 396
  await clickC(cdp, rect, 396, 32);
  await sleep(500);
  await shot(cdp, 'bench_02_scalability');

  // Tab 3 — Congestionamento — cx = 152 + 2*244 = 640
  await clickC(cdp, rect, 640, 32);
  await sleep(500);
  await shot(cdp, 'bench_03_congestion');

  // Tab 4 — Obj. Dinâmicos — cx = 152 + 3*244 = 884
  await clickC(cdp, rect, 884, 32);
  await sleep(500);
  await shot(cdp, 'bench_04_dynamic');

  // Tab 5 — Resumo — cx = 152 + 4*244 = 1128
  await clickC(cdp, rect, 1128, 32);
  await sleep(500);
  await shot(cdp, 'bench_05_summary');

  console.log('done');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
