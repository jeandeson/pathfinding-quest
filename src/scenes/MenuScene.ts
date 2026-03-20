// src/scenes/MenuScene.ts
import type { IScene }     from './Scene';
import type { GameEvents } from '../Game';
import type { EventBus }   from '../core/EventBus';
import type { InputManager } from '../core/InputManager';
import { Button }          from '../ui/Button';
import { roundedRect }     from '../rendering/drawUtils';
import { PathfindingAlgorithm, ALL_ALGORITHMS } from '../pathfinding/types';
import { SoundManager }    from '../core/SoundManager';

interface Star { x: number; y: number; r: number; speed: number }

export class MenuScene implements IScene {
  private buttons:   Button[]  = [];
  private stars:     Star[]    = [];
  private time       = 0;
  private selectedAlg: PathfindingAlgorithm = PathfindingAlgorithm.AStar;

  // Unsubscribe handles for InputManager listeners
  private unsubClick?: () => void;
  private unsubMove?:  () => void;

  constructor(
    private readonly canvas:  HTMLCanvasElement,
    private readonly bus:     EventBus<GameEvents>,
    private readonly input:   InputManager,
  ) {}

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  onEnter(): void {
    this.time  = 0;
    this.stars = this.buildStars();
    this.buildButtons();
    SoundManager.playMusic('menu-song');

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
    this.time += dt;
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > this.canvas.height) s.y = 0;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    const W = this.canvas.width, H = this.canvas.height;

    // Background
    ctx.fillStyle = '#08081a';
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of this.stars) {
      const a = 0.35 + Math.sin(this.time * 1.2 + s.x * 0.01) * 0.25;
      ctx.fillStyle = `rgba(190,210,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    // Nebula blobs
    const blobs = [
      { cx: W * 0.2, cy: H * 0.3, r: 220, c: 'rgba(80,20,140,0.18)' },
      { cx: W * 0.8, cy: H * 0.6, r: 200, c: 'rgba(20,60,130,0.18)' },
      { cx: W * 0.5, cy: H * 0.5, r: 180, c: 'rgba(100,10,60,0.12)' },
    ];
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r);
      g.addColorStop(0, b.c); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // Panel
    const pw = 520, ph = 580, px = W / 2 - pw / 2, py = 30;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle   = '#0d0d22';
    roundedRect(ctx, px, py, pw, ph, 20); ctx.fill();
    const border = ctx.createLinearGradient(px, py, px + pw, py + ph);
    border.addColorStop(0, '#7744cc'); border.addColorStop(1, '#2244aa');
    ctx.strokeStyle = border; ctx.lineWidth = 2;
    roundedRect(ctx, px, py, pw, ph, 20); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';

    // Subtitle
    ctx.font = '13px monospace'; ctx.fillStyle = '#9966ff';
    ctx.fillText('◈  PATHFINDING QUEST  ◈', W / 2, py + 56);

    // Title (pulsing)
    const pulse = 1 + Math.sin(this.time * 2) * 0.015;
    ctx.save();
    ctx.translate(W / 2, py + 118); ctx.scale(pulse, pulse);
    ctx.font = 'bold 58px monospace';
    const tg = ctx.createLinearGradient(-200, 0, 200, 0);
    tg.addColorStop(0, '#cc88ff'); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(1, '#88aaff');
    ctx.fillStyle   = tg;
    ctx.shadowColor = '#7722ff'; ctx.shadowBlur = 30;
    ctx.fillText('MAZE RUN', 0, 0);
    ctx.restore();

    // Divider (after title)
    ctx.strokeStyle = '#331166'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 40, py + 148); ctx.lineTo(px + pw - 40, py + 148); ctx.stroke();

    // Divider (before algo selection)
    ctx.beginPath(); ctx.moveTo(px + 40, py + 330); ctx.lineTo(px + pw - 40, py + 330); ctx.stroke();

    // Algorithm label
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = 'rgba(200,185,255,0.95)';
    ctx.fillText('— ALGORITMO DOS INIMIGOS —', W / 2, py + 350);
    ctx.restore();

    // Buttons
    for (const b of this.buttons) b.render(ctx);

    // Footer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(200,185,255,0.95)';
    ctx.fillText(`Selecionado: ${this.selectedAlg}`, W / 2, py + ph - 14);
    ctx.fillStyle = 'rgba(175,170,215,0.85)';
    ctx.fillText('Clique no mapa para mover · Shift=Dash · Espaço=Pular · D=Debug', W / 2, H - 18);
    ctx.restore();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildStars(): Star[] {
    return Array.from({ length: 90 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: Math.random() * 1.6 + 0.3,
      speed: Math.random() * 14 + 5,
    }));
  }

  private buildButtons(): void {
    const cx = this.canvas.width / 2;
    const algCols = [cx - 115, cx + 115];
    const algRows = [420, 470];

    this.buttons = [
      new Button({ label: '▶  INICIAR JOGO', cx, cy: 235, w: 290, h: 52, primary: true },
        () => this.bus.emit('scene:play', { enemyAlg: this.selectedAlg })),

      new Button({ label: '📊  EXECUTAR BENCHMARK', cx, cy: 300, w: 290, h: 40 },
        () => this.bus.emit('scene:benchmark', {})),

      ...ALL_ALGORITHMS.map((alg, i) =>
        new Button({
          label: alg,
          cx: algCols[i % 2],
          cy: algRows[Math.floor(i / 2)],
          w: 210, h: 42,
        },
          () => {
            this.selectedAlg = alg;
            // Atualiza estado `selected` apenas nos botões de algoritmo (índice ≥ 2)
            this.buttons.slice(2).forEach(b => { b.selected = b.label === alg; });
          })
      ),
    ];

    // Marca seleção padrão
    this.buttons.slice(2).forEach(b => { b.selected = b.label === this.selectedAlg; });
  }
}
