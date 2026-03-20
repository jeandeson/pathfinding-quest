// src/entities/Agent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Classe base para TODOS os agentes do jogo (jogador e inimigos).
// Gerencia: movimento ao longo de um caminho, animação de spritesheet,
// e efeito de squash & stretch (juice).
// ─────────────────────────────────────────────────────────────────────────────

import { Cell } from '../world/Cell';
import { GameConfig } from '../config/GameConfig';

const CFG_ANIM   = GameConfig.ANIMATION;

export interface AgentOptions {
  startCell:  Cell;
  cellSize:   number;
  color:      string;
  label:      string;
  speed:      number;
  spriteUrl?: string;
  spriteRow?: number;   // qual row do spritesheet (personagem), default 0
}

export abstract class Agent {
  protected currentCell: Cell;
  protected targetCell:  Cell | null = null;
  protected path:        Cell[]      = [];
  protected pathIndex:   number      = 0;
  protected worldX:      number;
  protected worldY:      number;
  protected speed:       number;
  protected cellSize:    number;
  protected isMoving:    boolean     = false;

  // Animação
  protected sprite:    HTMLImageElement | null = null;
  protected frameX     = 0;
  protected frameRow   = 0;   // row fixo do personagem no spritesheet
  private   animTimer  = 0;
  protected flipX      = false;  // espelha horizontalmente (movimento à esquerda)

  // Juice
  protected scaleX = 1;
  protected scaleY = 1;

  protected readonly color: string;
  protected readonly label: string;

  constructor(opts: AgentOptions) {
    this.currentCell = opts.startCell;
    this.worldX      = opts.startCell.worldX;
    this.worldY      = opts.startCell.worldY;
    this.cellSize    = opts.cellSize;
    this.color       = opts.color;
    this.label       = opts.label;
    this.speed       = opts.speed;

    this.frameRow = opts.spriteRow ?? 0;

    if (opts.spriteUrl) {
      this.sprite     = new Image();
      this.sprite.src = opts.spriteUrl;
    }
  }

  // ── Pathfinding interface ─────────────────────────────────────────────────

  setPath(path: Cell[] | null): void {
    if (!path || path.length === 0) {
      this.path       = [];
      this.targetCell = null;
      return;
    }
    this.path      = path;
    this.pathIndex = 0;
    this.advance();
  }

  protected advance(): void {
    if (this.pathIndex + 1 < this.path.length) {
      this.pathIndex++;
      this.targetCell = this.path[this.pathIndex];
    } else {
      this.targetCell = null;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt: number): void {
    this.updateMovement(dt);
    this.updateJuice(dt);
    this.updateAnimation(dt);
  }

  protected updateMovement(dt: number): void {
    if (!this.targetCell) {
      this.isMoving = false;
      this.frameX   = 0;
      return;
    }

    const tx = this.targetCell.worldX;
    const ty = this.targetCell.worldY;
    const dx = tx - this.worldX;
    const dy = ty - this.worldY;
    const dist = Math.hypot(dx, dy);

    // Flip horizontal quando vai para a esquerda; mantém flip ao mover vertical
    if (Math.abs(dx) > Math.abs(dy)) this.flipX = dx < 0;

    if (dist < 2) {
      this.worldX      = tx;
      this.worldY      = ty;
      this.currentCell = this.targetCell;
      this.advance();
      return;
    }

    this.isMoving  = true;
    const move     = this.currentSpeed() * dt;
    const ratio    = Math.min(1, move / dist);
    this.worldX   += dx * ratio;
    this.worldY   += dy * ratio;
  }

  /** Subclasses sobrescrevem para alterar velocidade (ex.: dash) */
  protected currentSpeed(): number {
    return this.speed;
  }

  protected updateJuice(_dt: number): void {
    // Retorno suave para escala neutra; squash/stretch pontual é feito por subclasses
    this.scaleX += (1 - this.scaleX) * 0.2;
    this.scaleY += (1 - this.scaleY) * 0.2;
  }

  protected updateAnimation(dt: number): void {
    if (!this.isMoving) return;
    this.animTimer += dt;
    if (this.animTimer > CFG_ANIM.FRAME_INTERVAL) {
      this.frameX    = (this.frameX + 1) % CFG_ANIM.MAX_FRAMES;
      this.animTimer = 0;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D, cellSize: number): void {
    this.applyTransform(ctx, this.worldX, this.worldY, cellSize);

    if (this.sprite?.complete) {
      this.applyGlow(ctx);
      const step = CFG_ANIM.SPRITE_WIDTH + CFG_ANIM.SPRITE_SPACING;
      ctx.drawImage(
        this.sprite,
        this.frameX   * step,
        this.frameRow * step,
        CFG_ANIM.SPRITE_WIDTH,
        CFG_ANIM.SPRITE_HEIGHT,
        this.worldX, this.worldY, cellSize, cellSize
      );
      ctx.shadowBlur = 0;
      ctx.fillStyle  = '#fff';
      ctx.font       = '12px monospace';
      ctx.fillText(this.label, this.worldX + 4, this.worldY - 4);
    } else {
      this.renderFallback(ctx, cellSize);
    }

    ctx.restore();
  }

  protected applyTransform(
    ctx: CanvasRenderingContext2D,
    drawX: number, drawY: number, size: number
  ): void {
    ctx.save();
    const cx = drawX + size / 2;
    const cy = drawY + size / 2;
    ctx.translate(cx, cy);
    ctx.scale(this.flipX ? -this.scaleX : this.scaleX, this.scaleY);
    ctx.translate(-cx, -cy);
  }

  /** Subclasses podem adicionar glow (ex.: dash) */
  protected applyGlow(_ctx: CanvasRenderingContext2D): void {}

  private renderFallback(ctx: CanvasRenderingContext2D, cellSize: number): void {
    const r  = cellSize / 2.5;
    const cx = this.worldX + cellSize / 2;
    const cy = this.worldY + cellSize / 2;

    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font      = '12px monospace';
    ctx.fillText(this.label, cx - 5, cy + 5);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  getCurrentCell(): Cell    { return this.currentCell; }
  getPath():        Cell[]  { return this.path; }
  getPathIndex():   number  { return this.pathIndex; }
}
