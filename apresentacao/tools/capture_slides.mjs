// capture_slides.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Captura, direto do <canvas> do simulador (resolução nativa 1280×960, sem
// reamostragem do navegador), as duas telas usadas no slide "Simulador":
//   assets/slide_menu.png        recorte do menu: botões INICIAR JOGO,
//                                EXECUTAR BENCHMARK e seleção de algoritmo
//   assets/slide_jogo_debug.png  jogo em modo de depuração (tecla D), com o
//                                caminho do jogador traçado após um clique
//
// Fonte padrão: a versão publicada (a mesma que a banca abre pelo QR code).
// Uso: node capture_slides.mjs [url]
// ─────────────────────────────────────────────────────────────────────────────

import { chromium }                 from 'playwright-core';
import { PNG }                      from 'pngjs';
import { writeFileSync }            from 'node:fs';
import { resolve, dirname }         from 'node:path';
import { fileURLToPath }            from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS    = resolve(__dirname, '..', 'assets');
const URL       = process.argv[2] || 'https://pathfinding-quest-j95b.vercel.app/';

// Recorte do menu em coordenadas do canvas (1280×960): do botão INICIAR JOGO
// até a última linha de algoritmos, na largura do painel central.
const MENU_CROP = { x: 380, y: 192, w: 520, h: 366 };
// Célula de destino do clique (coluna, linha) na grade 20×15 do jogo.
const CLICK_CELL = { col: +(process.env.CLICK_COL ?? 12), row: +(process.env.CLICK_ROW ?? 4) };
const WAIT_MS    = +(process.env.WAIT_MS ?? 450);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page    = await (await browser.newContext({ viewport: { width: 1600, height: 1100 } })).newPage();
const errors  = [];
page.on('pageerror', e => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('#gameCanvas');
await page.waitForTimeout(1500); // sprites + primeira renderização do menu

const canvasPng = async () => {
  const b64 = await page.evaluate(() => document.getElementById('gameCanvas').toDataURL('image/png').split(',')[1]);
  return PNG.sync.read(Buffer.from(b64, 'base64'));
};
const crop = (png, { x, y, w, h }) => {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
};
const save = (png, name) => {
  const out = resolve(ASSETS, name);
  writeFileSync(out, PNG.sync.write(png));
  console.log(`✓ ${name}  (${png.width}×${png.height})`);
};
const clickCanvas = async (cx, cy) => {
  const r = await page.evaluate(() => {
    const c = document.getElementById('gameCanvas');
    const b = c.getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height, cw: c.width, ch: c.height };
  });
  await page.mouse.click(r.x + cx * (r.w / r.cw), r.y + cy * (r.h / r.ch));
  return r;
};

// ── 1. Menu ──────────────────────────────────────────────────────────────────
const menu = await canvasPng();
if (menu.width !== 1280 || menu.height !== 960) throw new Error(`canvas do menu inesperado: ${menu.width}×${menu.height}`);
save(crop(menu, MENU_CROP), 'slide_menu.png');

// ── 2. Jogo em modo de depuração ─────────────────────────────────────────────
// O mapa é sorteado a cada partida. Os callouts do slide apontam para a célula
// clicada, então a captura só vale se o clique foi aceito (célula livre): nesse
// caso o jogo desenha um X amarelo no destino. Se não houver X, recarrega e tenta
// de novo com outro mapa.
const cx = Math.round((CLICK_CELL.col + 0.5) * 64), cy = Math.round((CLICK_CELL.row + 0.5) * 64);
const hasTargetX = (png) => {
  let yellow = 0;
  for (let d = -6; d <= 6; d++) {
    for (const [x, y] of [[cx + d, cy + d], [cx + d, cy - d]]) {      // as duas diagonais do X
      const i = (y * png.width + x) * 4;
      if (png.data[i] > 200 && png.data[i + 1] > 200 && png.data[i + 2] < 140) yellow++;
    }
  }
  return yellow >= 8;
};
let game = null;
for (let attempt = 1; attempt <= 8 && !game; attempt++) {
  if (attempt > 1) { await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200); }
  await clickCanvas(640, 235);            // ▶ INICIAR JOGO
  await page.waitForTimeout(900);
  await page.keyboard.press('d');         // tecla D → grade + custos f
  await page.waitForTimeout(150);
  await clickCanvas(cx, cy);
  await page.waitForTimeout(WAIT_MS);     // caminho recém-traçado ainda inteiro na tela
  const shot = await canvasPng();
  if (shot.width !== 1280 || shot.height !== 960) throw new Error(`canvas do jogo inesperado: ${shot.width}×${shot.height}`);
  if (hasTargetX(shot)) game = shot;
  else console.log(`  tentativa ${attempt}: célula (${CLICK_CELL.col},${CLICK_CELL.row}) ocupada neste mapa — sorteando outro`);
}
if (!game) throw new Error('não consegui um mapa com a célula de destino livre');
save(game, 'slide_jogo_debug.png');

await browser.close();
if (errors.length) { console.error('✗ erros de página:\n' + errors.join('\n')); process.exit(1); }
console.log(`\n✓ capturas feitas a partir de ${URL} · destino do clique: coluna ${CLICK_CELL.col}, linha ${CLICK_CELL.row}`);
