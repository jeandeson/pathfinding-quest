// src/world/GridRenderer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Responsabilidade única: RENDERIZAR o mapa.
// Não conhece pathfinding, entidades ou estado de jogo.
// ─────────────────────────────────────────────────────────────────────────────

import { Grid } from './Grid';
import { GameConfig } from '../config/GameConfig';

export class GridRenderer {
  private tileset        = new Image();
  private obstacleSprite = new Image();
  private tilesetReady   = false;
  private obstacleReady  = false;
  private itemPulse      = 0;

  private readonly tileSrc = GameConfig.ASSETS.TILE_SRC;

  constructor() {
    this.tileset.src        = GameConfig.ASSETS.TILESET;
    this.obstacleSprite.src = GameConfig.ASSETS.OBSTACLE;
    this.tileset.onload        = () => (this.tilesetReady   = true);
    this.obstacleSprite.onload = () => (this.obstacleReady  = true);
  }

  update(dt: number): void {
    this.itemPulse += dt * 3;
  }

  render(ctx: CanvasRenderingContext2D, grid: Grid, debug = false): void {
    const { cellSize } = grid;

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x];
        const { worldX: wx, worldY: wy } = cell;

        // ── Terreno ─────────────────────────────────────────────────────────
        if (this.tilesetReady) {
          ctx.drawImage(
            this.tileset,
            this.tileSrc.x, this.tileSrc.y, this.tileSrc.size, this.tileSrc.size,
            wx, wy, cellSize, cellSize
          );
        } else {
          ctx.fillStyle = '#2a3a2a';
          ctx.fillRect(wx, wy, cellSize, cellSize);
        }

        // ── Obstáculo ────────────────────────────────────────────────────────
        if (!cell.walkable) {
          if (this.obstacleReady) {
            ctx.drawImage(this.obstacleSprite, wx, wy, cellSize, cellSize);
          } else {
            ctx.fillStyle = '#8b3a3a';
            ctx.fillRect(wx, wy, cellSize, cellSize);
          }
        }

        // ── Item dourado ─────────────────────────────────────────────────────
        if (cell.hasItem) this.renderItem(ctx, wx, wy, cellSize, x, y);

        // ── Grade ────────────────────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(68,68,68,0.3)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(wx, wy, cellSize, cellSize);

        // ── Debug f-cost ─────────────────────────────────────────────────────
        if (debug && cell.f > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font      = '8px monospace';
          ctx.fillText(`${cell.f}`, wx + 4, wy + 13);
        }
      }
    }
  }

  private renderItem(
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number, size: number,
    x: number, y: number
  ): void {
    const pulse = 0.85 + Math.sin(this.itemPulse + x * 0.7 + y * 1.1) * 0.15;
    const r  = size * 0.22 * pulse;
    const cx = wx + size / 2;
    const cy = wy + size / 2;

    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 10 * pulse;

    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0,   '#fff9aa');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(1,   '#b8860b');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Raios giratórios
    ctx.strokeStyle = 'rgba(255,255,200,0.8)';
    ctx.lineWidth   = 1;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + this.itemPulse * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * 1.2, cy + Math.sin(angle) * r * 1.2);
      ctx.lineTo(cx + Math.cos(angle) * r * 1.7, cy + Math.sin(angle) * r * 1.7);
      ctx.stroke();
    }

    ctx.restore();
  }
}
