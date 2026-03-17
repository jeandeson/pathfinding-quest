// src/core/InputManager.ts

type MousePos = { x: number; y: number };
type ClickHandler = (pos: MousePos) => void;
type MoveHandler  = (pos: MousePos) => void;

/**
 * Single source of truth for all input.
 * Scenes subscribe to what they need; nothing else scatters addEventListener calls.
 */
export class InputManager {
  private keysDown   = new Set<string>();
  private keysJust   = new Set<string>(); // pressed this frame only
  private clickHandlers: ClickHandler[] = [];
  private moveHandlers:  MoveHandler[]  = [];

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup',   this.onKeyUp);
    canvas.addEventListener('click',     this.onMouseClick);
    canvas.addEventListener('mousemove', this.onMouseMove);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** True while the key is held. */
  isDown(key: string): boolean { return this.keysDown.has(key); }

  /** True only on the first frame the key was pressed. */
  wasJustPressed(key: string): boolean { return this.keysJust.has(key); }

  /** Register a click callback (unregister by calling the returned fn). */
  onClick(handler: ClickHandler): () => void {
    this.clickHandlers.push(handler);
    return () => { this.clickHandlers = this.clickHandlers.filter(h => h !== handler); };
  }

  /** Register a mousemove callback. */
  onMove(handler: MoveHandler): () => void {
    this.moveHandlers.push(handler);
    return () => { this.moveHandlers = this.moveHandlers.filter(h => h !== handler); };
  }

  /**
   * Call at the END of each frame to flush one-frame keys.
   * The Game loop is responsible for calling this.
   */
  flush(): void {
    this.keysJust.clear();
  }

  /** Remove all global listeners (call on app teardown). */
  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup',   this.onKeyUp);
    this.canvas.removeEventListener('click',     this.onMouseClick);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private toCanvasPos(e: MouseEvent): MousePos {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width  / r.width),
      y: (e.clientY - r.top)  * (this.canvas.height / r.height),
    };
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.keysDown.has(e.key)) this.keysJust.add(e.key);
    this.keysDown.add(e.key);
    // Prevent page scroll on Space / Arrow keys
    if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.key);
  };

  private onMouseClick = (e: MouseEvent) => {
    const pos = this.toCanvasPos(e);
    this.clickHandlers.forEach(h => h(pos));
  };

  private onMouseMove = (e: MouseEvent) => {
    const pos = this.toCanvasPos(e);
    this.moveHandlers.forEach(h => h(pos));
  };
}
