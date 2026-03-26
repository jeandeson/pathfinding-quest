// src/benchmark/ChartRenderer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Renderiza gráficos de linha e barra diretamente no Canvas 2D.
// Sem Chart.js, sem D3 — zero dependências externas.
// ─────────────────────────────────────────────────────────────────────────────

import { BenchmarkResult }      from '../benchmarks/BenchmarkResult';
import { PathfindingAlgorithm } from '../pathfinding/PathfindingSystem';

// Paleta de cores por algoritmo — consistente em todos os gráficos
export const ALGO_COLORS: Record<PathfindingAlgorithm, string> = {
  [PathfindingAlgorithm.AStar]:    '#66aaff',
  [PathfindingAlgorithm.Dijkstra]: '#ffaa44',
  [PathfindingAlgorithm.BFS]:      '#55dd77',
  [PathfindingAlgorithm.DFS]:      '#ff6688',
  [PathfindingAlgorithm.JPS]:      '#cc88ff',
};

export interface ChartArea {
  x: number; y: number; w: number; h: number;
  title:    string;
  subtitle: string;
}

export interface BarGroup {
  label: string;
  bars: { alg: PathfindingAlgorithm; value: number }[];
}

export interface LineSeries {
  alg: PathfindingAlgorithm;
  points: { x: number; y: number }[];
}

// Padding padrão — espaço para fontes maiores e legenda
const PAD = { top: 70, right: 28, bottom: 70, left: 90 };

// ── Gráfico de Linhas ──────────────────────────────────────────────────────

/**
 * Gráfico de linha: eixo X = xField, eixo Y = `yField`.
 * Agrupa resultados por algoritmo e plota a média de cada grupo.
 */
export function drawLineChart(
  ctx:     CanvasRenderingContext2D,
  area:    ChartArea,
  results: BenchmarkResult[],
  xField:  keyof BenchmarkResult,
  yField:  keyof BenchmarkResult,
  yLabel:  string,
): void {
  const { x, y, w, h } = area;
  const pad = PAD;
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top  - pad.bottom;
  const ox = x + pad.left;
  const oy = y + pad.top;

  drawChartBase(ctx, area, pad, yLabel);

  const algorithms = Object.values(PathfindingAlgorithm);

  // Calcula médias por (algoritmo, xValue)
  type Series = Map<number, number[]>;
  const seriesMap = new Map<PathfindingAlgorithm, Series>();
  for (const alg of algorithms) seriesMap.set(alg, new Map());

  for (const r of results) {
    const series = seriesMap.get(r.algorithm);
    if (!series) continue;
    const xv = r[xField] as number;
    if (!series.has(xv)) series.set(xv, []);
    series.get(xv)!.push(r[yField] as number);
  }

  // Domínios
  const allX = [...new Set(results.map(r => r[xField] as number))].sort((a, b) => a - b);
  const allY = results.map(r => r[yField] as number).filter(v => v > 0);
  if (allX.length < 2 || allY.length === 0) {
    drawNoData(ctx, x + w / 2, y + h / 2);
    return;
  }
  const xMin = allX[0], xMax = allX[allX.length - 1];
  const yMax = Math.max(...allY) * 1.15;

  const toPixel = (xv: number, yv: number) => ({
    px: ox + ((xv - xMin) / (xMax - xMin || 1)) * iw,
    py: oy + ih - (yv / yMax) * ih,
  });

  // Linhas de grade Y + labels
  const ticks = 4;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = 1;
  ctx.fillStyle   = 'rgba(220,215,240,0.95)';
  ctx.font        = '15px monospace';
  ctx.textAlign   = 'right';
  for (let i = 0; i <= ticks; i++) {
    const v  = (yMax / ticks) * i;
    const py = oy + ih - (v / yMax) * ih;
    ctx.beginPath(); ctx.moveTo(ox, py); ctx.lineTo(ox + iw, py); ctx.stroke();
    ctx.fillText(fmtNum(v), ox - 10, py + 5);
  }

  // Ticks X
  ctx.textAlign = 'center';
  ctx.font      = '15px monospace';
  for (const xv of allX) {
    const px = ox + ((xv - xMin) / (xMax - xMin || 1)) * iw;
    ctx.fillText(String(xv), px, oy + ih + 22);
  }
  ctx.restore();

  // Série por algoritmo
  for (const alg of algorithms) {
    const series = seriesMap.get(alg)!;
    if (series.size === 0) continue;

    const points = allX
      .filter(xv => series.has(xv))
      .map(xv => {
        const vals = series.get(xv)!;
        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        return { xv, mean };
      });

    if (points.length < 2) continue;

    ctx.save();
    ctx.strokeStyle = ALGO_COLORS[alg];
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = ALGO_COLORS[alg];
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    points.forEach(({ xv, mean }, i) => {
      const { px, py } = toPixel(xv, mean);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Pontos
    ctx.fillStyle = ALGO_COLORS[alg];
    for (const { xv, mean } of points) {
      const { px, py } = toPixel(xv, mean);
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ── Gráfico de Barras ─────────────────────────────────────────────────────

/**
 * Barras agrupadas por algoritmo, eixo X = algoritmo, eixo Y = média de `yField`.
 */
export function drawBarChart(
  ctx:     CanvasRenderingContext2D,
  area:    ChartArea,
  results: BenchmarkResult[],
  yField:  keyof BenchmarkResult,
  yLabel:  string,
): void {
  const { x, y, w, h } = area;
  const pad = PAD;
  const iw  = w - pad.left - pad.right;
  const ih  = h - pad.top  - pad.bottom;
  const ox  = x + pad.left;
  const oy  = y + pad.top;

  drawChartBase(ctx, area, pad, yLabel);

  const algorithms = Object.values(PathfindingAlgorithm);
  const means = algorithms.map(alg => {
    const vals = results
      .filter(r => r.algorithm === alg)
      .map(r => r[yField] as number);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  });

  const yMax = Math.max(...means) * 1.15 || 1;
  const bw   = (iw / algorithms.length) * 0.55;
  const gap  = iw / algorithms.length;

  // Grade Y
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = 1;
  ctx.fillStyle   = 'rgba(220,215,240,0.95)';
  ctx.font        = '15px monospace';
  ctx.textAlign   = 'right';
  for (let i = 0; i <= 4; i++) {
    const v  = (yMax / 4) * i;
    const py = oy + ih - (v / yMax) * ih;
    ctx.beginPath(); ctx.moveTo(ox, py); ctx.lineTo(ox + iw, py); ctx.stroke();
    ctx.fillText(fmtNum(v), ox - 10, py + 5);
  }
  ctx.restore();

  algorithms.forEach((alg, i) => {
    const mean = means[i];
    const bx   = ox + i * gap + gap / 2 - bw / 2;
    const bh   = (mean / yMax) * ih;
    const by   = oy + ih - bh;

    ctx.save();
    ctx.fillStyle   = ALGO_COLORS[alg];
    ctx.shadowColor = ALGO_COLORS[alg];
    ctx.shadowBlur  = 8;
    ctx.fillRect(bx, by, bw, bh);
    ctx.shadowBlur  = 0;

    // Label eixo X — nome do algoritmo abaixo da barra
    ctx.fillStyle    = 'rgba(230,225,255,0.97)';
    ctx.font         = 'bold 16px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(alg, bx + bw / 2, oy + ih + 10);

    // Valor numérico no topo da barra
    if (bh > 22) {
      ctx.fillStyle    = '#ffffff';
      ctx.font         = 'bold 15px monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmtNum(mean), bx + bw / 2, by - 5);
    }
    ctx.restore();
  });
}

// ── Legenda ───────────────────────────────────────────────────────────────

export function drawLegend(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
): void {
  const algorithms = Object.values(PathfindingAlgorithm);
  ctx.save();
  ctx.font      = '12px monospace';
  ctx.textAlign = 'left';
  algorithms.forEach((alg, i) => {
    const lx = x + i * 130;
    ctx.fillStyle = ALGO_COLORS[alg];
    ctx.fillRect(lx, y - 10, 18, 12);
    ctx.fillStyle = 'rgba(235,232,255,0.97)';
    ctx.fillText(alg, lx + 22, y);
  });
  ctx.restore();
}

// ── Helpers internos ──────────────────────────────────────────────────────

function drawChartBase(
  ctx:    CanvasRenderingContext2D,
  area:   ChartArea,
  pad:    { top: number; right: number; bottom: number; left: number },
  yLabel: string,
): void {
  const { x, y, w, h, title, subtitle } = area;
  const ox = x + pad.left;
  const oy = y + pad.top;
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top  - pad.bottom;

  // Fundo do painel
  ctx.save();
  ctx.fillStyle   = 'rgba(10,10,30,0.85)';
  ctx.strokeStyle = 'rgba(120,100,220,0.45)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill(); ctx.stroke();

  // Título
  ctx.fillStyle    = 'rgba(235,215,255,1.0)';
  ctx.font         = 'bold 20px monospace';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, x + 16, y + 26);

  // Subtítulo
  ctx.fillStyle = 'rgba(195,185,225,0.95)';
  ctx.font      = '14px monospace';
  ctx.fillText(subtitle, x + 16, y + 48);

  // Legenda inline — alinhada à direita do painel
  const algorithms  = Object.values(PathfindingAlgorithm);
  const itemW       = 155;
  const legendX     = x + w - algorithms.length * itemW - 16;
  const legendBaseY = y + 36;
  ctx.font      = '15px monospace';
  ctx.textAlign = 'left';
  algorithms.forEach((alg, i) => {
    const lx = legendX + i * itemW;
    // Swatch colorido
    ctx.fillStyle   = ALGO_COLORS[alg];
    ctx.shadowColor = ALGO_COLORS[alg];
    ctx.shadowBlur  = 5;
    ctx.fillRect(lx, legendBaseY - 12, 22, 14);
    ctx.shadowBlur  = 0;
    // Nome do algoritmo
    ctx.fillStyle = 'rgba(240,238,255,0.97)';
    ctx.fillText(alg, lx + 26, legendBaseY);
  });

  // Eixos
  ctx.strokeStyle = 'rgba(200,190,230,0.55)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ih);           // Y
  ctx.moveTo(ox, oy + ih); ctx.lineTo(ox + iw, oy + ih); // X
  ctx.stroke();

  // Label Y rotacionado
  ctx.save();
  ctx.translate(x + 18, oy + ih / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle    = 'rgba(210,200,240,0.95)';
  ctx.font         = '15px monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawNoData(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle    = 'rgba(200,185,225,0.65)';
  ctx.font         = '14px monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('aguardando dados…', cx, cy);
  ctx.restore();
}

function fmtNum(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (v < 10)    return v.toFixed(2);
  return v.toFixed(0);
}
