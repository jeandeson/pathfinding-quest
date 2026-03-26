// src/scenes/GameScene.ts
import type { IScene }           from './Scene';
import type { GameEvents }       from '../Game';
import { EventBus }              from '../core/EventBus';
import { InputManager }          from '../core/InputManager';
import { AssetManager }          from '../core/AssetManager';
import { Grid }                  from '../world/Grid';
import { GridRenderer }          from '../world/GridRenderer';
import { Player }                from '../entities/Player';
import { Enemy }                 from '../entities/Enemy';
import { HUD }                   from '../ui/HUD';
import { drawCellX }             from '../rendering/drawUtils';
import type { Cell }             from '../world/Cell';                   // ← world, não pathfinding/types
import { PathfindingSystem,
         PathfindingAlgorithm }  from '../pathfinding/PathfindingSystem'; // ← fonte única do enum
import { GameConfig }            from '../config/GameConfig';
import { SoundManager }          from '../core/SoundManager';

interface Particle { x: number; y: number; alpha: number; text: string }

const { ROWS, COLS, CELL_SIZE } = GameConfig.GRID;

export class GameScene implements IScene {

  // ── World ──────────────────────────────────────────────────────────────────
  private grid!:        Grid;
  private renderer!:    GridRenderer;
  private pathfinder!:  PathfindingSystem;   // ← responsável pelo findPath, não o Grid

  // ── Entities ───────────────────────────────────────────────────────────────
  private player!:      Player;
  private enemies:      Enemy[]     = [];
  private goalCell!:    Cell;
  private playerGoal:   Cell | null = null;

  // ── State ──────────────────────────────────────────────────────────────────
  private score                     = 0;
  private particles:  Particle[]    = [];
  private enemyTimer                = 0;
  private readonly ENEMY_INTERVAL   = 0.5;
  private playerAlg                 = PathfindingAlgorithm.AStar;
  private enemyAlg:   PathfindingAlgorithm;
  private debugMode                 = false;
  private allItemsCollected         = false;
  private lastPlayerCell:   Cell | null = null;

  // ── UI ─────────────────────────────────────────────────────────────────────
  private hud!: HUD;

  // ── Cleanup ────────────────────────────────────────────────────────────────
  private unsubClick?: () => void;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx:    CanvasRenderingContext2D,
    private readonly bus:    EventBus<GameEvents>,
    private readonly input:  InputManager,
    enemyAlg: PathfindingAlgorithm,
  ) {
    this.enemyAlg = enemyAlg;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onEnter(): void {
    this.hud        = new HUD();
    this.reset();
    this.unsubClick = this.input.onClick(pos => this.handleClick(pos));
    SoundManager.playMusic('bg-song');
  }

  onExit(): void {
    this.hud.hide();
    this.unsubClick?.();
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt: number): void {
    this.handleInput();
    this.renderer.update(dt);

    this.player.update(dt);
    for (const e of this.enemies) e.update(dt);

    // Som de passo ao chegar numa nova célula
    const pc = this.player.getCurrentCell();
    if (this.lastPlayerCell && pc !== this.lastPlayerCell)
      SoundManager.play('move', 0.4);
    this.lastPlayerCell = pc;

    this.checkItemPickup();
    this.checkWinLose();

    this.enemyTimer += dt;
    if (this.enemyTimer >= this.ENEMY_INTERVAL) {
      this.recalcEnemies();
      this.enemyTimer = 0;
    }

    this.particles = this.particles.filter(p => {
      p.y -= 40 * dt; p.alpha -= dt * 1.5; return p.alpha > 0;
    });

    this.hud.update({
      score:             this.score,
      dashCooldownRatio: this.player.getDashCooldownRatio(),
      playerAlg:         this.playerAlg,
      enemyAlg:          this.enemyAlg,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderer.render(ctx, this.grid, this.debugMode);
    this.renderPath(ctx);

    for (const e of this.enemies) e.render(ctx, CELL_SIZE);
    this.player.render(ctx, CELL_SIZE);

    this.renderer.renderExit(ctx, this.goalCell.worldX, this.goalCell.worldY, CELL_SIZE, this.allItemsCollected);

    if (this.playerGoal && this.playerGoal !== this.goalCell)
      drawCellX(ctx, this.playerGoal.worldX, this.playerGoal.worldY, CELL_SIZE, '#ff0');

    if (this.debugMode) this.renderDebug(ctx);
    this.renderParticles(ctx);
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  private reset(): void {
    this.canvas.width  = COLS * CELL_SIZE;
    this.canvas.height = ROWS * CELL_SIZE;
    this.ctx.imageSmoothingEnabled = false;

    this.grid       = new Grid(ROWS, COLS, CELL_SIZE);
    this.renderer   = new GridRenderer();
    this.pathfinder = new PathfindingSystem(this.grid);  // ← criado com a grid

    this.score             = 0;
    this.particles         = [];
    this.enemyTimer        = 0;
    this.playerGoal        = null;
    this.allItemsCollected = false;
    this.lastPlayerCell   = null;

    // Jogador
    const pCell     = this.grid.cells[0][0];
    pCell.walkable  = true;
    // AssetManager.get() retorna HTMLImageElement | null → null-check obrigatório
    const playerSrc = AssetManager.has('player') ? AssetManager.get('player')!.src : undefined;

    this.player = new Player({
      startCell: pCell,
      cellSize:  CELL_SIZE,
      color:     '#3366ff',
      label:     'P',
      speed:     GameConfig.PLAYER.SPEED,
      spriteUrl: playerSrc,
      spriteRow: 0,   // row 0 = personagem do jogador
    });

    // Inimigos
    const enemySrc    = AssetManager.has('enemy') ? AssetManager.get('enemy')!.src : undefined;
    const enemyStarts = [{ y: 14, x: 19 }, { y: 14, x: 17 }, { y: 12, x: 19 }];

    this.enemies = enemyStarts.map((pos, i) => {
      const c    = this.grid.cells[pos.y][pos.x];
      c.walkable = true;
      return new Enemy({
        startCell: c,
        cellSize:  CELL_SIZE,
        color:     '#cc2222',
        label:     `E${i + 1}`,
        speed:     GameConfig.ENEMY.SPEED,
        spriteUrl: enemySrc,
        spriteRow: i % 4,   // cada inimigo usa um personagem diferente (rows 0-3)
      });
    });

    // Objetivo
    this.goalCell          = this.grid.cells[ROWS - 1][COLS - 1];
    this.goalCell.walkable = true;

    // Garante que player, inimigos e objetivo são mutuamente acessíveis.
    // Se alguma célula de spawn ficou isolada por obstáculos, um corredor é escavado.
    this.grid.guaranteeConnected([
      { x: 0,        y: 0        },
      { x: COLS - 1, y: ROWS - 1 },
      ...enemyStarts.map(p => ({ x: p.x, y: p.y })),
    ]);

    this.hud.show();
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private handleInput(): void {
    if (this.input.wasJustPressed('Shift')) this.player.activateDash();
    if (this.input.wasJustPressed(' ') && this.player.tryJump(this.grid))
      SoundManager.play('jump', 0.6);
    if (this.input.wasJustPressed('d') || this.input.wasJustPressed('D'))
      this.debugMode = !this.debugMode;

    const playerAlgMap: [string, PathfindingAlgorithm][] = [
      ['1', PathfindingAlgorithm.AStar],
      ['2', PathfindingAlgorithm.Dijkstra],
      ['3', PathfindingAlgorithm.BFS],
      ['4', PathfindingAlgorithm.DFS],
      ['5', PathfindingAlgorithm.JPS],
    ];
    for (const [key, alg] of playerAlgMap) {
      if (this.input.wasJustPressed(key) && this.playerAlg !== alg) {
        this.playerAlg = alg;
        this.recalcPlayer();
      }
    }

    const enemyAlgMap: [string, PathfindingAlgorithm][] = [
      ['q', PathfindingAlgorithm.AStar],
      ['w', PathfindingAlgorithm.Dijkstra],
      ['e', PathfindingAlgorithm.BFS],
      ['r', PathfindingAlgorithm.DFS],
      ['t', PathfindingAlgorithm.JPS],
    ];
    for (const [key, alg] of enemyAlgMap) {
      if (this.input.wasJustPressed(key) && this.enemyAlg !== alg) {
        this.enemyAlg = alg;
        this.recalcEnemies();
      }
    }
  }

  private handleClick(pos: { x: number; y: number }): void {
    const cell = this.grid.getCellFromPixel(pos.x, pos.y);
    if (!cell || !cell.walkable || cell === this.player.getCurrentCell()) return;
    this.playerGoal = cell;
    this.recalcPlayer();
  }

  // ── Pathfinding ────────────────────────────────────────────────────────────

  private recalcPlayer(): void {
    if (!this.playerGoal) return;
    const path = this.pathfinder.findPath(           // ← this.pathfinder, não this.grid
      this.player.getCurrentCell(),
      this.playerGoal,
      this.playerAlg,
    );
    if (path && path.length > 0) this.player.setPath(path);
  }

  private recalcEnemies(): void {
    const target = this.player.getCurrentCell();
    for (const e of this.enemies) {
      const path = this.pathfinder.findPath(         // ← idem
        e.getCurrentCell(),
        target,
        this.enemyAlg,
      );
      if (path && path.length > 0) e.setPath(path);
    }
  }

  // ── Checks ─────────────────────────────────────────────────────────────────

  private checkItemPickup(): void {
    const cell = this.player.getCurrentCell();
    if (this.grid.collectItem(cell)) {
      this.score += GameConfig.SCORE.ITEM_VALUE;
      SoundManager.play('coin', 0.7);
      this.particles.push({
        x: cell.worldX + CELL_SIZE / 2, y: cell.worldY,
        alpha: 1, text: `+${GameConfig.SCORE.ITEM_VALUE}`,
      });
      if (this.grid.getRemainingItems() === 0) {
        this.allItemsCollected = true;
        this.particles.push({
          x: this.goalCell.worldX + CELL_SIZE / 2, y: this.goalCell.worldY,
          alpha: 1, text: '★ SAÍDA ABERTA!',
        });
      }
    }
  }

  private checkWinLose(): void {
    if (this.allItemsCollected && this.player.getCurrentCell() === this.goalCell) {
      this.bus.emit('scene:success', { score: this.score });
      return;
    }
    const pc = this.player.getCurrentCell();
    for (const e of this.enemies) {
      if (e.getCurrentCell() === pc) {
        SoundManager.play('lose');
        this.bus.emit('scene:gameover', { score: this.score });
        return;
      }
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  private renderPath(ctx: CanvasRenderingContext2D): void {
    const path = this.player.getPath();
    const pi   = this.player.getPathIndex();
    path.forEach((cell, i) => {
      if (i <= pi) return;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle   = i === pi + 1 ? '#ffff00' : '#00cc44';
      ctx.fillRect(cell.worldX + 10, cell.worldY + 10, CELL_SIZE - 20, CELL_SIZE - 20);
      ctx.globalAlpha = 1;
    });
  }

  private renderDebug(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#fff';
    ctx.font      = '8px monospace';
    for (let y = 0; y < this.grid.rows; y++)
      for (let x = 0; x < this.grid.cols; x++) {
        const c = this.grid.cells[y][x];
        if (c.f > 0) ctx.fillText(`${c.f}`, c.worldX + 4, c.worldY + 13);
      }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = '#ffd700';
      ctx.font        = 'bold 16px monospace';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur  = 8;
      ctx.fillText(p.text, p.x - 12, p.y);
      ctx.restore();
    }
  }
}