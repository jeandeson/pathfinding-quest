// src/Game.ts
import { EventBus }        from './core/EventBus';
import { InputManager }    from './core/InputManager';
import { AssetManager }    from './core/AssetManager';
import { SoundManager }    from './core/SoundManager';
import type { IScene }     from './scenes/Scene';
import { MenuScene }       from './scenes/MenuScene';
import { GameScene }       from './scenes/GameScene';
import { ResultScene }     from './scenes/ResultScene';
import { BenchmarkScene }  from './scenes/BenchmarkScene';
import { PathfindingAlgorithm } from './pathfinding/types';

// ── Typed event map ──────────────────────────────────────────────────────────

export type GameEvents = {
  'scene:menu':      Record<string, never>;
  'scene:play':      { enemyAlg?: PathfindingAlgorithm };
  'scene:gameover':  { score: number };
  'scene:success':   { score: number };
  'scene:benchmark': Record<string, never>;   // ← novo
};

// ── Asset manifest ───────────────────────────────────────────────────────────

const ASSET_MANIFEST: Record<string, string> = {
  tileset: 'src/assets/PNG/Tiles/Tilemap/tilemap_packed.png',
  player:  'src/assets/PNG/Players/Tilemap/tilemap_packed.png',
  enemy:   'src/assets/PNG/Enemies/Tilemap/tilemap_packed.png',
};

// ── Game ─────────────────────────────────────────────────────────────────────

/**
 * Thin orchestrator.
 * Owns: canvas, render loop, event bus, input manager, asset loading.
 * Does NOT contain gameplay, menu or UI code — that lives in scenes.
 */
export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx:    CanvasRenderingContext2D;
  private readonly bus     = new EventBus<GameEvents>();
  private readonly input:  InputManager;

  private scene!:    IScene;
  private lastTime   = 0;

  private enemyAlg: PathfindingAlgorithm = PathfindingAlgorithm.AStar;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx   = this.canvas.getContext('2d');
    if (!ctx) throw new Error('[Game] Cannot acquire 2D context');
    this.ctx    = ctx;
    this.ctx.imageSmoothingEnabled = false;

    // Default canvas size (menu)
    this.canvas.width  = 20 * 64;
    this.canvas.height = 15 * 64;

    this.input = new InputManager(this.canvas);
    this.wireEvents();
  }

  // ── Boot ────────────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    await AssetManager.preload(ASSET_MANIFEST);
    SoundManager.preload({
      coin: 'src/assets/Sounds/coin-a.ogg',
      jump: 'src/assets/Sounds/jump-a.ogg',
      move: 'src/assets/Sounds/move-c.ogg',
      lose: 'src/assets/Sounds/lose-a.ogg',
    });
    SoundManager.preloadMusic({
      'menu-song': 'src/assets/Sounds/menu-song.mp3',
      'bg-song':   'src/assets/Sounds/bg-song.mp3',
    });
    this.switchScene(new MenuScene(this.canvas, this.bus, this.input));
    requestAnimationFrame(this.loop);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.scene.update(dt);
    this.scene.render(this.ctx);

    this.input.flush(); // clear wasJustPressed flags
    requestAnimationFrame(this.loop);
  };

  // ── Scene transitions ────────────────────────────────────────────────────────

  private switchScene(next: IScene): void {
    this.scene?.onExit();
    this.scene = next;
    this.scene.onEnter();
  }

  private wireEvents(): void {
    this.bus.on('scene:menu', () => {
      this.switchScene(new MenuScene(this.canvas, this.bus, this.input));
    });

    this.bus.on('scene:play', ({ enemyAlg }) => {
      if (enemyAlg) this.enemyAlg = enemyAlg;
      this.switchScene(
        new GameScene(this.canvas, this.ctx, this.bus, this.input, this.enemyAlg)
      );
    });

    this.bus.on('scene:gameover', ({ score }) => {
      this.switchScene(new ResultScene(this.canvas, this.bus, this.input, 'gameover', score));
    });

    this.bus.on('scene:success', ({ score }) => {
      this.switchScene(new ResultScene(this.canvas, this.bus, this.input, 'success', score));
    });

    this.bus.on('scene:benchmark', () => {
      this.switchScene(new BenchmarkScene(
        this.canvas,
        this.ctx,
        this.input,
        () => this.bus.emit('scene:menu', {}),   // onBack → volta ao menu
        // () => this.bus.emit('scene:play', { enemyAlg: this.enemyAlg })
      ));
    });
  }
}
