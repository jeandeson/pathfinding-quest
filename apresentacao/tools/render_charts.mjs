// Renders chart.html?id=A..D to high-DPI PNGs via headless Chrome.

import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';

const HOST = '127.0.0.1', PORT = 9222;
const ROOT = `file:///${resolve('chart.html').replace(/\\/g, '/')}`;
const OUT  = resolve('../charts');

async function getTarget() {
  const r = await fetch(`http://${HOST}:${PORT}/json/list`);
  const list = await r.json();
  return list.find(t => t.type === 'page' && !t.url.startsWith('devtools://'));
}

function client(ws) {
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

async function main() {
  const t = await getTarget();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  const cdp = client(ws);

  // 1600x900 viewport, deviceScaleFactor 2 → 3200x1800 PNG output
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 2, mobile: false });
  await cdp.send('Page.enable');

  const charts = ['A', 'B', 'C', 'D'];
  for (const id of charts) {
    const url = `${ROOT}?id=${id}`;
    const loaded = new Promise(r => cdp.on('Page.loadEventFired', r));
    await cdp.send('Page.navigate', { url });
    await loaded;
    await sleep(700); // allow Chart.js to layout
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const path = `${OUT}/chart_${id}.png`;
    writeFileSync(path, Buffer.from(r.data, 'base64'));
    console.log(`✓ chart_${id}.png (${Buffer.from(r.data, 'base64').length} bytes)`);
  }

  console.log('done');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
