// render_charts_pw.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Renderiza chart.html?id=A..D em PNGs de alta resolução usando o Chrome do
// sistema via Playwright (channel: 'chrome' — não baixa binário).
// Os dados vêm de chart_data.js (gerado por build_chart_data.mjs a partir do CSV).
//
// Uso: node render_charts_pw.mjs   (rode build_chart_data.mjs antes)
// ─────────────────────────────────────────────────────────────────────────────

import { chromium }                       from 'playwright-core';
import { resolve, dirname }               from 'node:path';
import { fileURLToPath, pathToFileURL }   from 'node:url';
import { existsSync, statSync, mkdirSync } from 'node:fs';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const chartHtml  = pathToFileURL(resolve(__dirname, 'chart.html')).href;
// 'dark' (padrão) → apresentacao/charts (slides); 'light' → figuras/ (documento/PDF).
const THEME      = process.argv[2] || 'dark';
const OUT        = THEME === 'light' ? resolve(__dirname, '..', '..', 'figuras') : resolve(__dirname, '..', 'charts');
mkdirSync(OUT, { recursive: true });

if (!existsSync(resolve(__dirname, 'chart_data.js'))) {
  console.error('✗ chart_data.js ausente — rode `node build_chart_data.mjs` primeiro.');
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Captura erros de JS para não gerar PNG silenciosamente quebrado.
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

for (const id of ['A', 'B', 'C', 'D']) {
  await page.goto(`${chartHtml}?id=${id}&theme=${THEME}`, { waitUntil: 'load' });

  // Garante que os dados do CSV chegaram e o gráfico foi criado.
  const okData = await page.evaluate(() => !!(window.CHART_DATA && window.Chart));
  if (!okData) { console.error(`✗ chart ${id}: CHART_DATA/Chart ausente`); process.exit(1); }

  await page.waitForTimeout(700); // layout do Chart.js (animation:false → desenho síncrono)
  const out = `${OUT}/chart_${id}.png`;
  await page.screenshot({ path: out });
  const kb = (statSync(out).size / 1024).toFixed(0);
  console.log(`✓ chart_${id}.png  (${kb} KB)`);
}

await browser.close();

if (errors.length) {
  console.error('\n✗ Erros de página detectados:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`\n✓ 4 gráficos (tema ${THEME}) renderizados sem erros de JS → ${OUT}`);
