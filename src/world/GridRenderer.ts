// src/world/GridRenderer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Responsabilidade única: RENDERIZAR o mapa.
// Não conhece pathfinding, entidades ou estado de jogo.
// ─────────────────────────────────────────────────────────────────────────────

import { Grid } from './Grid';
import { GameConfig } from '../config/GameConfig';

export class GridRenderer {
  private tileset      = new Image();
  private tilesetReady = false;
  private itemPulse    = 0;

  private readonly groundTiles = GameConfig.ASSETS.GROUND_TILES;
  private readonly obsSrc      = GameConfig.ASSETS.OBSTACLE_SRC;

  constructor() {
    this.tileset.src    = GameConfig.ASSETS.TILESET;
    this.tileset.onload = () => (this.tilesetReady = true);
  }

  update(dt: number): void {
    this.itemPulse += dt * 3;
  }

  render(ctx: CanvasRenderingContext2D, grid: Grid, debug = false): void {
    const { cellSize } = grid;
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x];
        const wx   = Math.round(cell.worldX);
        const wy   = Math.round(cell.worldY);

        // ── Terreno (variante por posição para quebrar monotonia) ────────────
        if (this.tilesetReady) {
          const vi = ((x * 7919 + y * 6271) & 0xff) % this.groundTiles.length;
          const gt = this.groundTiles[vi];
          ctx.drawImage(
            this.tileset,
            gt.x, gt.y, gt.size, gt.size,
            wx, wy, cellSize, cellSize
          );
        } else {
          ctx.fillStyle = '#2a3a2a';
          ctx.fillRect(wx, wy, cellSize, cellSize);
        }

        // ── Obstáculo ────────────────────────────────────────────────────────
        if (!cell.walkable) {
          if (this.tilesetReady) {
            ctx.drawImage(
              this.tileset,
              this.obsSrc.x, this.obsSrc.y, this.obsSrc.size, this.obsSrc.size,
              wx, wy, cellSize, cellSize
            );
          } else {
            ctx.fillStyle = '#8b3a3a';
            ctx.fillRect(wx, wy, cellSize, cellSize);
          }
        }

        // ── Item dourado ─────────────────────────────────────────────────────
        if (cell.hasItem) this.renderItem(ctx, wx, wy, cellSize, x, y);

        // ── Grade (apenas em modo debug) ──────────────────────────────────────
        if (debug) {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth   = 1;
          ctx.strokeRect(wx, wy, cellSize, cellSize);
        }

        // ── Debug f-cost ─────────────────────────────────────────────────────
        if (debug && cell.f > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font      = '8px monospace';
          ctx.fillText(`${cell.f}`, wx + 4, wy + 13);
        }
      }
    }
  }

  // ── Maçã (coletável) ────────────────────────────────────────────────────────

  private renderItem(
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number, size: number,
    x: number, y: number
  ): void {
    const bob = Math.sin(this.itemPulse + x * 0.7 + y * 1.1) * 3;
    const r   = size * 0.24;
    const cx  = wx + size / 2;
    const cy  = wy + size * 0.52 + bob;

    ctx.save();

    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, wy + size * 0.84, r * 0.65, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo vermelho
    ctx.fillStyle = '#cc2211';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Brilho
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.28, cy - r * 0.3, r * 0.3, r * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Cabo
    ctx.strokeStyle = '#5c3317';
    ctx.lineWidth   = Math.max(1.5, size * 0.035);
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.1, cy - r * 0.92);
    ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 1.55, cx + r * 0.15, cy - r * 1.8);
    ctx.stroke();

    // Folha
    ctx.fillStyle = '#2d8a2d';
    ctx.beginPath();
    ctx.save();
    ctx.translate(cx + r * 0.38, cy - r * 1.38);
    ctx.rotate(0.55);
    ctx.ellipse(0, 0, r * 0.36, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ── Saída (porta fechada ou aberta dependendo das maçãs coletadas) ──────────

  renderExit(
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number, cellSize: number,
    open: boolean
  ): void {
    if (!this.tilesetReady) return;
    const src = open ? GameConfig.ASSETS.EXIT_OPEN_SRC : GameConfig.ASSETS.EXIT_CLOSED_SRC;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.tileset, src.x, src.y, src.size, src.size, wx, wy, cellSize, cellSize);
  }
}
