// src/ui/Button.ts
import { roundedRect } from '../rendering/drawUtils';

export interface ButtonOptions {
  label: string;
  cx: number; cy: number;
  w: number;  h: number;
  primary?: boolean;
}

/**
 * Self-contained UI button.
 * Owns its own hit-test and render logic.
 */
export class Button {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly primary: boolean;
  hovered: boolean = false;
  selected: boolean = false;

  private onClickFn: () => void;

  constructor(opts: ButtonOptions, onClick: () => void) {
    this.label   = opts.label;
    this.x       = opts.cx - opts.w / 2;
    this.y       = opts.cy - opts.h / 2;
    this.w       = opts.w;
    this.h       = opts.h;
    this.primary = opts.primary ?? false;
    this.onClickFn = onClick;
  }

  contains(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.y + this.h;
  }

  click(): void { this.onClickFn(); }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const active = this.hovered || this.selected;

    // Glow
    if (active) {
      ctx.shadowColor = this.primary ? '#aa66ff' : '#4488ff';
      ctx.shadowBlur  = 16;
    }

    // Background
    if (this.primary) {
      const g = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      g.addColorStop(0, this.hovered ? '#9955ff' : '#7733cc');
      g.addColorStop(1, this.hovered ? '#6633bb' : '#441199');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = this.selected
        ? 'rgba(70,50,170,0.92)'
        : this.hovered
          ? 'rgba(55,35,130,0.85)'
          : 'rgba(25,15,70,0.72)';
    }
    roundedRect(ctx, this.x, this.y, this.w, this.h, 10);
    ctx.fill();

    // Border
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = this.selected  ? '#9977ff'
                    : this.primary   ? '#aa77ff'
                    :                  '#332266';
    ctx.lineWidth   = this.selected ? 2 : 1;
    roundedRect(ctx, this.x, this.y, this.w, this.h, 10);
    ctx.stroke();

    // Label
    ctx.fillStyle    = active ? '#ffffff' : this.primary ? '#eeddff' : '#ccbbee';
    ctx.font         = this.primary ? 'bold 18px monospace' : '15px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.w / 2, this.y + this.h / 2);

    ctx.restore();
  }
}
