// src/rendering/drawUtils.ts

/** Draws a rounded rectangle path (no fill/stroke — caller decides). */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draws an X mark at a grid cell position. */
export function drawCellX(
  ctx: CanvasRenderingContext2D,
  wx: number, wy: number, cellSize: number, color: string
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(wx + 5, wy + 5);
  ctx.lineTo(wx + cellSize - 5, wy + cellSize - 5);
  ctx.moveTo(wx + cellSize - 5, wy + 5);
  ctx.lineTo(wx + 5, wy + cellSize - 5);
  ctx.stroke();
}
