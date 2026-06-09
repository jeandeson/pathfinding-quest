// CDP-based screenshot tool — no external deps, uses Node 22 built-in WebSocket.

import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';

const HOST = '127.0.0.1';
const PORT = 9222;
const TARGET_URL = 'http://localhost:5173/';
const OUT_DIR = resolve('../assets');
const WIDTH = 1920, HEIGHT = 1080;

async function getTarget() {
  const r = await fetch(`http://${HOST}:${PORT}/json/list`);
  const list = await r.json();
  const page = list.find(t => t.type === 'page' && !t.url.startsWith('devtools://'));
  if (!page) throw new Error('no page target');
  return page;
}

function makeClient(ws) {
  let nextId = 1;
  const pending = new Map(), eventHandlers = new Map();
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id != null) {
      const cb = pending.get(msg.id);
      if (cb) { pending.delete(msg.id); msg.error ? cb.reject(msg.error) : cb.resolve(msg.result); }
    } else if (msg.method && eventHandlers.has(msg.method)) {
      eventHandlers.get(msg.method)(msg.params);
    }
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
    },
    on(method, handler) { eventHandlers.set(method, handler); }
  };
}

async function connect() {
  const target = await getTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  return makeClient(ws);
}

async function screenshot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT_DIR}/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log(`  → saved ${name}.png`);
}

async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: `(${expr})()`, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`eval: ${JSON.stringify(r.exceptionDetails)}`);
  return r.result.value;
}

async function getCanvasRect(cdp) {
  return await evalJS(cdp, `() => {
    const c = document.getElementById('gameCanvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height, cw: c.width, ch: c.height };
  }`);
}

async function clickCanvas(cdp, rect, cx, cy) {
  const vx = rect.x + cx * (rect.width  / rect.cw);
  const vy = rect.y + cy * (rect.height / rect.ch);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved',    x: vx, y: vy });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed',  x: vx, y: vy, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: vx, y: vy, button: 'left', clickCount: 1 });
  console.log(`  click canvas(${cx},${cy}) → viewport(${vx.toFixed(0)},${vy.toFixed(0)})`);
}

async function keyPress(cdp, key, code) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp',   key, code });
}

async function navigate(cdp, url) {
  await cdp.send('Page.enable');
  const loaded = new Promise(res => cdp.on('Page.loadEventFired', res));
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(1500);
}

async function setViewport(cdp, w, h) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
}

// ── Plan ─────────────────────────────────────────────────────────────────────

async function main() {
  const cdp = await connect();
  await setViewport(cdp, WIDTH, HEIGHT);

  // ── PARTE 1: Menu + Jogo com debug ────────────────────────────────────────
  console.log('[1/3] Menu + Jogo');
  await navigate(cdp, TARGET_URL);
  let rect = await getCanvasRect(cdp);
  console.log('canvas rect:', rect);

  await screenshot(cdp, '01_menu_inicial');

  // Inicia jogo (A* default)
  await clickCanvas(cdp, rect, 640, 235);
  await sleep(1500);
  rect = await getCanvasRect(cdp);
  await screenshot(cdp, '02_jogo_a_star_inicio');

  // Move player para o canto inferior direito — força travessia longa
  await clickCanvas(cdp, rect, rect.cw * 0.90, rect.ch * 0.85);
  await sleep(800);
  await screenshot(cdp, '03_jogo_em_movimento');

  // Ativa debug
  await keyPress(cdp, 'd', 'KeyD');
  await sleep(400);
  // Move novamente para gerar pathfinding visível
  await clickCanvas(cdp, rect, rect.cw * 0.10, rect.ch * 0.15);
  await sleep(1200);
  await screenshot(cdp, '04_jogo_debug_pathfinding');

  // Mais um movimento longo cruzando obstáculos
  await sleep(1500);
  await clickCanvas(cdp, rect, rect.cw * 0.85, rect.ch * 0.15);
  await sleep(1500);
  await screenshot(cdp, '05_jogo_debug_acao');

  // ── PARTE 2: Trocar para JPS e capturar de novo ──────────────────────────
  console.log('[2/3] Reload + selecionar JPS');
  await navigate(cdp, TARGET_URL);
  rect = await getCanvasRect(cdp);

  // Tenta clicar JPS — orphan centrado em canvas (640, 520)
  await clickCanvas(cdp, rect, 640, 520);
  await sleep(400);
  await screenshot(cdp, '06_menu_jps_selecionado');

  // Inicia jogo com JPS
  await clickCanvas(cdp, rect, 640, 235);
  await sleep(1500);
  rect = await getCanvasRect(cdp);
  await keyPress(cdp, 'd', 'KeyD');
  await sleep(300);
  await clickCanvas(cdp, rect, rect.cw * 0.85, rect.ch * 0.85);
  await sleep(1500);
  await screenshot(cdp, '07_jogo_jps_debug');

  // As capturas de benchmark (bench_00..05) ficam no script dedicado
  // capture_benchmark.mjs, que percorre cada aba de resultados.
  console.log('done');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
