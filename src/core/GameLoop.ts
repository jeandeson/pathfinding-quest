// src/core/GameLoop.ts
// ─────────────────────────────────────────────────────────────────────────────
// Encapsula o requestAnimationFrame e fornece deltaTime estável.
// Separa a lógica de tempo do código de jogo — nenhuma cena precisa
// lidar com timestamps ou rAF diretamente.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DELTA = 0.1; // trava em 10fps mínimo para evitar spiral of death

export class GameLoop {
  private lastTime = 0;
  private rafId    = 0;
  private running  = false;

  constructor(
    private readonly onUpdate: (dt: number) => void,
    private readonly onRender: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running  = true;
    this.lastTime = performance.now();
    this.rafId    = requestAnimationFrame(this.tick.bind(this));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick(now: number): void {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, MAX_DELTA);
    this.lastTime = now;
    this.onUpdate(dt);
    this.onRender();
    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }
}
