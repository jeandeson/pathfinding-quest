// render_slide_charts.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Renderiza os gráficos DOS SLIDES (slide_charts.html) no tamanho exato em que
// entram no PowerPoint: a página tem w×h px CSS = w×h pt no slide, com fator de
// escala 4 (≈ 288 dpi). Assim cada "font NNpx" do gráfico é NN pt na projeção.
//
// Uso: node build_chart_data.mjs && node render_slide_charts.mjs
// Saída: apresentacao/charts/slide_<id>.png
// ─────────────────────────────────────────────────────────────────────────────

import { chromium }                        from 'playwright-core';
import { resolve, dirname }                from 'node:path';
import { fileURLToPath, pathToFileURL }    from 'node:url';
import { existsSync, statSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const page_url  = pathToFileURL(resolve(__dirname, 'slide_charts.html')).href;
const OUT       = resolve(__dirname, '..', 'charts');
mkdirSync(OUT, { recursive: true });

// id → tamanho (pt) do retângulo que o gráfico ocupa no slide (ver build_from_template.ps1)
export const CHARTS = [
  { id: 'nodes',  w: 575, h: 385 },
  { id: 'scale',  w: 575, h: 385 },
  { id: 'npc50',  w: 575, h: 385 },
  { id: 'scale5', w: 790, h: 370 },
];

if (!existsSync(resolve(__dirname, 'chart_data.js'))) {
  console.error('✗ chart_data.js ausente — rode `node build_chart_data.mjs` primeiro.');
  process.exit(1);
}

// Devolutiva de 18/09/2026: rótulos de gráficos com no mínimo 18–20 pt. Adotado: 20.
const MIN_FONT_PX = 20;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];

for (const c of CHARTS) {
  const ctx  = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 4 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${c.id}: ${e}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${c.id}: ${m.text()}`); });
  // registra o tamanho de fonte de cada texto realmente desenhado no canvas
  await page.addInitScript(() => {
    window.__fonts = {};
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...rest) {
      const m = /(\d+(?:\.\d+)?)px/.exec(this.font);
      if (m && String(t).trim() !== '') window.__fonts[m[1]] = (window.__fonts[m[1]] || 0) + 1;
      return orig.call(this, t, ...rest);
    };
  });

  await page.goto(`${page_url}?id=${c.id}&w=${c.w}&h=${c.h}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 10000 }).catch(() => errors.push(`${c.id}: gráfico não ficou pronto`));
  await page.waitForTimeout(300);

  const sizes = Object.keys(await page.evaluate(() => window.__fonts)).map(Number).sort((a, b) => a - b);
  if (!sizes.length) errors.push(`${c.id}: nenhum texto desenhado`);
  else if (sizes[0] < MIN_FONT_PX) errors.push(`${c.id}: texto de ${sizes[0]} px no gráfico (mínimo ${MIN_FONT_PX})`);

  const out = resolve(OUT, `slide_${c.id}.png`);
  await page.screenshot({ path: out });
  console.log(`✓ slide_${c.id}.png  ${c.w}×${c.h} pt  fontes ${sizes.join('/')} px  (${(statSync(out).size / 1024).toFixed(0)} KB)`);
  await ctx.close();
}
await browser.close();

if (errors.length) { console.error('\n✗ Erros de página:\n' + errors.join('\n')); process.exit(1); }
console.log(`\n✓ ${CHARTS.length} gráficos de slide renderizados sem erros → ${OUT}`);
