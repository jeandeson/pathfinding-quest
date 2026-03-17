// src/entities/Player.ts
// ─────────────────────────────────────────────────────────────────────────────
// Jogador controlado pelo usuário. Estende Agent adicionando:
//   • Dash (boost de velocidade temporário)
//   • Jump (pular sobre obstáculos)
//   • Squash & stretch aprimorado durante dash
// ─────────────────────────────────────────────────────────────────────────────

import { Agent, AgentOptions } from './Agent';
import { Cell } from '../world/Cell';
import { Grid } from '../world/Grid';
import { GameConfig } from '../config/GameConfig';

const CFG = GameConfig.PLAYER;

export class Player extends Agent {
  // ── Dash ──────────────────────────────────────────────────────────────────
  private isDashing    = false;
  private dashTimer    = 0;
  private dashCooldown = 0;

  // ── Jump ──────────────────────────────────────────────────────────────────
  private isJumping      = false;
  private jumpTimer      = 0;
  private jumpHeight     = 0;
  private jumpTarget:  Cell | null = null;

  constructor(opts: AgentOptions) {
    super(opts);
  }

  // ── Ações públicas ────────────────────────────────────────────────────────

  activateDash(): void {
    if (this.isDashing || this.dashCooldown > 0) return;
    this.isDashing    = true;
    this.dashTimer    = 0;
    this.dashCooldown = CFG.DASH_COOLDOWN;
    // Squash inicial do dash
    this.scaleX = 1.4;
    this.scaleY = 0.7;
  }

  tryJump(grid: Grid): boolean {
    if (this.isJumping) return false;

    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const ox = this.currentCell.x + dx,  oy = this.currentCell.y + dy;
      const lx = this.currentCell.x + dx*2, ly = this.currentCell.y + dy*2;

      if (
        grid.isValid(ox, oy) && !grid.cells[oy][ox].walkable &&
        grid.isValid(lx, ly) &&  grid.cells[ly][lx].walkable
      ) {
        this.isJumping  = true;
        this.jumpTimer  = 0;
        this.jumpTarget = grid.cells[ly][lx];
        this.targetCell = null;
        this.path       = [];
        return true;
      }
    }
    return false;
  }

  getDashCooldownRatio(): number {
    return Math.max(0, this.dashCooldown / CFG.DASH_COOLDOWN);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  override update(dt: number): void {
    this.tickDash(dt);
    this.tickJump(dt);
    if (!this.isJumping) this.updateMovement(dt);
    this.updateJuice(dt);
    if (this.isMoving) this.tickAnimation(dt);
  }

  private tickDash(dt: number): void {
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (!this.isDashing) return;
    this.dashTimer += dt;
    if (this.dashTimer >= CFG.DASH_DURATION) {
      this.isDashing = false;
      this.dashTimer = 0;
    }
  }

  private tickJump(dt: number): void {
    if (!this.isJumping || !this.jumpTarget) return;

    this.jumpTimer += dt;
    const t = Math.min(this.jumpTimer / CFG.JUMP_DURATION, 1);
    this.jumpHeight = Math.sin(t * Math.PI) * this.cellSize * CFG.JUMP_HEIGHT_MULTIPLIER;

    const tx = this.jumpTarget.worldX, ty = this.jumpTarget.worldY;
    const dx = tx - this.worldX,       dy = ty - this.worldY;
    const dist = Math.hypot(dx, dy);
    const speed = (this.cellSize * 2.5) * dt / CFG.JUMP_DURATION;

    if (dist < 4 || t >= 1) {
      this.worldX      = tx;
      this.worldY      = ty;
      this.currentCell = this.jumpTarget;
      this.isJumping   = false;
      this.jumpHeight  = 0;
      this.jumpTarget  = null;
      // Squash de pouso
      this.scaleX = 1.3;
      this.scaleY = 0.65;
    } else {
      const r = Math.min(1, speed / dist);
      this.worldX += dx * r;
      this.worldY += dy * r;
    }
    this.isMoving = true;
  }

  private tickAnimation(dt: number): void {
    // chamado para manter o timer funcionando durante salto
    void dt;
  }

  // ── Speed com dash ────────────────────────────────────────────────────────

  protected override currentSpeed(): number {
    return this.isDashing
      ? this.speed * CFG.DASH_SPEED_MULTIPLIER
      : this.speed;
  }

  // ── Juice override ────────────────────────────────────────────────────────

  protected override updateJuice(dt: number): void {
    void dt;
    if (this.isJumping) return;

    if (this.isDashing && this.targetCell) {
      const dx = this.targetCell.worldX - this.worldX;
      const dy = this.targetCell.worldY - this.worldY;
      if (Math.abs(dx) > Math.abs(dy)) { this.scaleX = 1.35; this.scaleY = 0.75; }
      else                              { this.scaleX = 0.75; this.scaleY = 1.35; }
    } else if (this.isMoving) {
      // Chamamos o wobble da base manualmente
      super.updateJuice(dt);
    } else {
      this.scaleX += (1 - this.scaleX) * 0.2;
      this.scaleY += (1 - this.scaleY) * 0.2;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  override render(ctx: CanvasRenderingContext2D, cellSize: number): void {
    const drawY = this.worldY - this.jumpHeight;

    // Sombra no chão durante salto
    if (this.isJumping) {
      const a = 0.3 * (1 - this.jumpHeight / (cellSize * CFG.JUMP_HEIGHT_MULTIPLIER));
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.beginPath();
      ctx.ellipse(
        this.worldX + cellSize / 2,
        this.worldY + cellSize * 0.85,
        cellSize * 0.3, cellSize * 0.1,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // Re-usa o render da base mas com Y ajustado pelo salto
    this.applyTransform(ctx, this.worldX, drawY, cellSize);

    if ((this as any).sprite?.complete) {
      this.applyGlow(ctx);
      ctx.drawImage(
        (this as any).sprite,
        (this as any).frameX * GameConfig.ANIMATION.SPRITE_WIDTH,
        (this as any).frameY * GameConfig.ANIMATION.SPRITE_HEIGHT,
        GameConfig.ANIMATION.SPRITE_WIDTH,
        GameConfig.ANIMATION.SPRITE_HEIGHT,
        this.worldX, drawY, cellSize, cellSize
      );
      ctx.shadowBlur = 0;
      ctx.fillStyle  = '#fff';
      ctx.font       = '12px monospace';
      ctx.fillText(this.label, this.worldX + 4, drawY - 4);
    } else {
      this.renderCircleFallback(ctx, this.worldX, drawY, cellSize);
    }

    ctx.restore();
  }

  private renderCircleFallback(
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number, size: number
  ): void {
    const r  = size / 2.5;
    const cx = wx + size / 2;
    const cy = wy + size / 2;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
    ctx.fillText(this.label, cx - 5, cy + 5);
  }

  protected override applyGlow(ctx: CanvasRenderingContext2D): void {
    if (this.isDashing) {
      ctx.shadowColor = '#88eeff';
      ctx.shadowBlur  = 18;
    }
  }
}
