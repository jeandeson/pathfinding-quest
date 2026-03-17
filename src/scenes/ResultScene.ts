// src/scenes/ResultScene.ts
import type { IScene }       from './Scene';
import type { GameEvents }   from '../Game';
import type { EventBus }     from '../core/EventBus';
import type { InputManager } from '../core/InputManager';
import { Button }            from '../ui/Button';
import { roundedRect }       from '../rendering/drawUtils';

export type ResultType = 'gameover' | 'success';

/**
 * Parameterised result screen.
 * One class handles both Game Over and Stage Clear — only colours and copy differ.
 */
export class ResultScene implements IScene {
  private type:    ResultType;
  private score:   number;
  private alpha    = 0;
  private timer    = 0;
  private buttons: Button[] = [];

  private unsubClick?: () => void;
  private unsubMove?:  () => void;

  constructor(
    private readonly canvas:  HTMLCanvasElement,
    private readonly bus:     EventBus<GameEvents>,
    private readonly input:   InputManager,
    type: ResultType,
    score: number,
  ) {
    this.type  = type;
    this.score = score;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  onEnter(): void {
    this.alpha = 0;
    this.timer = 0;
    this.buildButtons();

    this.unsubMove  = this.input.onMove(pos => {
      this.buttons.forEach(b => { b.hovered = b.contains(pos.x, pos.y); });
    });
    this.unsubClick = this.input.onClick(pos => {
      this.buttons.forEach(b => { if (b.contains(pos.x, pos.y)) b.click(); });
    });
  }

  onExit(): void {
    this.unsubClick?.();
    this.unsubMove?.();
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt: number): void {
    this.timer += dt;
    this.alpha  = Math.min(this.timer / 0.5, 1);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    const W = this.canvas.width, H = this.canvas.height;
    const a = this.alpha;
    const go = this.type === 'gameover';

    // Tinted backdrop
    ctx.save();
    ctx.globalAlpha = a * 0.82;
    ctx.fillStyle   = go ? '#110008' : '#050f01';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    if (a < 0.25) return;

    // Confetti (success only)
    if (!go) this.renderConfetti(ctx, W, H, a);

    // Panel
    const panelA = Math.max(0, (a - 0.25) / 0.75);
    const pw = 440, ph = 290, px = W / 2 - pw / 2, py = H / 2 - ph / 2 - 60;

    ctx.save();
    ctx.globalAlpha = panelA;

    ctx.fillStyle = go ? '#180610' : '#081408';
    roundedRect(ctx, px, py, pw, ph, 18); ctx.fill();
    ctx.strokeStyle = go ? '#cc2244' : '#44cc66'; ctx.lineWidth = 2;
    roundedRect(ctx, px, py, pw, ph, 18); ctx.stroke();

    ctx.textAlign = 'center';

    // Headline
    if (go) {
      ctx.font = 'bold 54px monospace'; ctx.fillStyle = '#ff3355';
      ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 28;
      ctx.fillText('GAME OVER', W / 2, py + 74);
    } else {
      ctx.font = 'bold 46px monospace';
      const tg = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
      tg.addColorStop(0, '#ffd700'); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(1, '#88ffaa');
      ctx.fillStyle   = tg;
      ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 26;
      ctx.fillText('STAGE CLEAR!', W / 2, py + 68);
      ctx.shadowBlur = 0; ctx.font = '26px monospace'; ctx.fillStyle = '#ffd700';
      ctx.fillText('★  ★  ★', W / 2, py + 108);
    }

    // Divider
    ctx.shadowBlur = 0; ctx.strokeStyle = go ? '#440011' : '#113311'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 30, py + 125); ctx.lineTo(px + pw - 30, py + 125); ctx.stroke();

    // Score
    ctx.font = '14px monospace'; ctx.fillStyle = go ? '#cc8899' : '#88bb88';
    ctx.fillText('PONTUAÇÃO FINAL', W / 2, py + 158);

    ctx.font = 'bold 46px monospace';
    const sg = ctx.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, 0);
    sg.addColorStop(0, go ? '#ff8899' : '#ffd700');
    sg.addColorStop(1, go ? '#ffccaa' : '#aaffcc');
    ctx.fillStyle = sg;
    ctx.fillText(`${this.score}`, W / 2, py + 224);

    ctx.restore();

    // Buttons (appear after panel fades in)
    if (panelA > 0.5) {
      ctx.save();
      ctx.globalAlpha = (panelA - 0.5) / 0.5;
      for (const b of this.buttons) b.render(ctx);
      ctx.restore();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private renderConfetti(
    ctx: CanvasRenderingContext2D, W: number, H: number, a: number
  ): void {
    const palette = ['#ffd700','#ff88aa','#88ffcc','#aaaaff','#ff8800','#88ffff'];
    ctx.save();
    ctx.globalAlpha = a * 0.65;
    for (let i = 0; i < 70; i++) {
      const cx = ((Math.sin(i * 2.39) * 0.5 + 0.5) * W + this.timer * (i % 2 === 0 ? 28 : -28)) % W;
      const cy = (this.timer * 55 + i * 97) % H;
      ctx.fillStyle = palette[i % palette.length];
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.timer + i);
      ctx.fillRect(-3, -3, 7, 7); ctx.restore();
    }
    ctx.restore();
  }

  private buildButtons(): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.buttons = [
      new Button({ label: '↺  JOGAR NOVAMENTE', cx, cy: cy + 110, w: 290, h: 52, primary: true },
        () => this.bus.emit('scene:play', {})),
      new Button({ label: '⌂  MENU PRINCIPAL', cx, cy: cy + 175, w: 290, h: 52 },
        () => this.bus.emit('scene:menu', {})),
    ];
  }
}
