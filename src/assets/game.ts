// game.ts
import { Grid, PathfindingAlgorithm } from './grid';
import { Cell } from './grid';
import { Player } from './player';

type GameState = 'menu' | 'playing' | 'gameover' | 'success';

// ─── Helpers ────────────────────────────────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

interface Button {
  label: string;
  x: number; y: number; w: number; h: number;
  hovered: boolean;
  action: () => void;
}

// ─── Game ────────────────────────────────────────────────────────────────────

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private deltaTime: number = 0;

  private state: GameState = 'menu';

  // Gameplay
  private grid!: Grid;
  private cellSize: number = 64;
  private agents: Player[] = [];
  private numAgents: number = 4;
  private selectedAgentIndex: number = 0;
  private agentGoals: (Cell | null)[] = [];
  private goalCell!: Cell;
  private debugMode: boolean = false;
  private currentPlayerAlgorithm: PathfindingAlgorithm = PathfindingAlgorithm.AStar;
  private currentEnemyAlgorithm: PathfindingAlgorithm = PathfindingAlgorithm.AStar;
  private enemyUpdateTimer: number = 0;
  private readonly enemyUpdateInterval: number = 0.5;

  private score: number = 0;
  private endScore: number = 0;
  private particles: { x: number; y: number; alpha: number; text: string }[] = [];

  // UI
  private hudElement: HTMLDivElement;
  private buttons: Button[] = [];
  private overlayAlpha: number = 0;
  private overlayTimer: number = 0;

  // Menu stars
  private stars: { x: number; y: number; r: number; speed: number }[] = [];
  private menuTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.canvas.width = 20 * this.cellSize;
    this.canvas.height = 15 * this.cellSize;

    this.hudElement = (document.getElementById('hud') as HTMLDivElement) ?? (() => {
      const d = document.createElement('div');
      d.id = 'hud';
      document.body.appendChild(d);
      return d;
    })();

    this.showHud(false);
    this.generateStars();
    this.buildMenuButtons();

    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  // ── Stars ──────────────────────────────────────────────────────────────────

  private generateStars() {
    this.stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: Math.random() * 1.6 + 0.3,
      speed: Math.random() * 14 + 5,
    }));
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  private btn(label: string, cx: number, cy: number, w: number, h: number, action: () => void): Button {
    return { label, x: cx - w / 2, y: cy - h / 2, w, h, hovered: false, action };
  }

  private buildMenuButtons() {
    const cx = this.canvas.width / 2;
    const algs: PathfindingAlgorithm[] = [
      PathfindingAlgorithm.AStar,
      PathfindingAlgorithm.Dijkstra,
      PathfindingAlgorithm.BFS,
      PathfindingAlgorithm.DFS,
    ];
    this.buttons = [
      this.btn('▶  INICIAR JOGO', cx, 368, 290, 54, () => this.startGame()),
      ...algs.map((alg, i) =>
        this.btn(alg, cx, 468 + i * 58, 230, 44, () => { this.currentEnemyAlgorithm = alg; })
      ),
    ];
  }

  private buildResultButtons() {
    const cx = this.canvas.width / 2;
    const H = this.canvas.height;
    this.buttons = [
      this.btn('↺  JOGAR NOVAMENTE', cx, H / 2 + 110, 290, 52, () => this.startGame()),
      this.btn('⌂  MENU PRINCIPAL',  cx, H / 2 + 175, 290, 52, () => this.goToMenu()),
    ];
  }

  // ── Mouse ──────────────────────────────────────────────────────────────────

  private onMouseMove(e: MouseEvent) {
    const { x, y } = this.canvasPos(e);
    for (const b of this.buttons) {
      b.hovered = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }
  }

  private onCanvasClick(e: MouseEvent) {
    if (this.state === 'playing') { this.handleGameClick(e); return; }
    const { x, y } = this.canvasPos(e);
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) b.action();
    }
  }

  private canvasPos(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top)  * (this.canvas.height / r.height),
    };
  }

  // ── State transitions ──────────────────────────────────────────────────────

  private goToMenu() {
    this.state = 'menu';
    this.overlayAlpha = 0;
    this.overlayTimer = 0;
    this.menuTime = 0;
    this.buildMenuButtons();
    this.showHud(false);
  }

  private startGame() {
    this.state = 'playing';
    this.overlayAlpha = 0;
    this.overlayTimer = 0;
    this.buttons = [];
    this.initGameplay();
    this.showHud(true);
  }

  private triggerGameOver() {
    this.state = 'gameover';
    this.endScore = this.score;
    this.overlayAlpha = 0;
    this.overlayTimer = 0;
    this.buildResultButtons();
    this.showHud(false);
  }

  private triggerSuccess() {
    this.state = 'success';
    this.endScore = this.score;
    this.overlayAlpha = 0;
    this.overlayTimer = 0;
    this.buildResultButtons();
    this.showHud(false);
  }

  private showHud(v: boolean) {
    this.hudElement.style.display = v ? 'block' : 'none';
  }

  // ── Gameplay init ──────────────────────────────────────────────────────────

  private initGameplay() {
    const rows = 15, cols = 20;
    this.grid = new Grid(rows, cols, this.cellSize);
    this.canvas.width  = cols * this.cellSize;
    this.canvas.height = rows * this.cellSize;
    this.ctx.imageSmoothingEnabled = false;

    const starts = [{ y:0,x:0 }, { y:14,x:19 }, { y:14,x:17 }, { y:12,x:19 }];
    const colors  = ['#00f','#f00','#f00','#f00'];
    this.agents = [];
    this.agentGoals = [];

    for (let i = 0; i < this.numAgents; i++) {
      const sc = this.grid.cells[starts[i].y][starts[i].x];
      sc.walkable = true;
      const url = i === 0 ? 'src/assets/Characters/sheep.png' : 'src/assets/Characters/cow.png';
      const a = new Player(sc, this.cellSize, colors[i], i === 0 ? 'P' : 'E', url);
      if (i === 0) a.isPlayer = true;
      this.agents.push(a);
      this.agentGoals.push(null);
    }

    this.goalCell = this.grid.cells[14][19];
    this.goalCell.walkable = true;
    this.score = 0;
    this.particles = [];
    this.selectedAgentIndex = 0;
    this.enemyUpdateTimer = 0;
    this.debugMode = false;
    this.updateHud();
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent) {
    if (this.state !== 'playing') return;
    const player = this.agents[0];
    if (e.key === 'Shift')  { player.activateDash(); return; }
    if (e.key === ' ')      { e.preventDefault(); player.tryJump(this.grid); return; }
    if (e.key === 'd' || e.key === 'D') { this.debugMode = !this.debugMode; }
    else if (e.key === '1') { this.currentPlayerAlgorithm = PathfindingAlgorithm.AStar;     this.recalcPlayer(); }
    else if (e.key === '2') { this.currentPlayerAlgorithm = PathfindingAlgorithm.Dijkstra;  this.recalcPlayer(); }
    else if (e.key === '3') { this.currentPlayerAlgorithm = PathfindingAlgorithm.BFS;       this.recalcPlayer(); }
    else if (e.key === '4') { this.currentPlayerAlgorithm = PathfindingAlgorithm.DFS;       this.recalcPlayer(); }
    else if (e.key === 'q') { this.currentEnemyAlgorithm  = PathfindingAlgorithm.AStar;     this.recalcEnemies(); }
    else if (e.key === 'w') { this.currentEnemyAlgorithm  = PathfindingAlgorithm.Dijkstra;  this.recalcEnemies(); }
    else if (e.key === 'e') { this.currentEnemyAlgorithm  = PathfindingAlgorithm.BFS;       this.recalcEnemies(); }
    else if (e.key === 'r') { this.currentEnemyAlgorithm  = PathfindingAlgorithm.DFS;       this.recalcEnemies(); }
    else if (e.key >= '5' && e.key <= '8') {
      const i = parseInt(e.key) - 5;
      if (i < this.numAgents) this.selectedAgentIndex = i;
    }
    this.updateHud();
    this.enemyUpdateTimer = 0;
  }

  private recalcPlayer()  { this.recalcAgentPath(0); }
  private recalcEnemies() { for (let i = 1; i < this.numAgents; i++) { this.agentGoals[i] = this.agents[0].getCurrentCell(); this.recalcAgentPath(i); } }

  private recalcAgentPath(i: number) {
    const goal = this.agentGoals[i];
    if (!goal) return;
    const alg = i === 0 ? this.currentPlayerAlgorithm : this.currentEnemyAlgorithm;
    const path = this.grid.findPath(this.agents[i].getCurrentCell(), goal, alg);
    if (path && path.length > 0) this.agents[i].setPath(path);
  }

  private handleGameClick(e: MouseEvent) {
    const { x, y } = this.canvasPos(e);
    const cell = this.grid.getCellFromPixel(x, y);
    if (cell && cell.walkable && cell !== this.agents[0].getCurrentCell()) {
      this.agentGoals[0] = cell;
      this.recalcAgentPath(0);
    }
  }

  // ── Main loop ──────────────────────────────────────────────────────────────

  public start() {
    const loop = (t: number) => {
      this.deltaTime = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update() {
    this.overlayTimer  += this.deltaTime;
    this.overlayAlpha   = Math.min(this.overlayTimer / 0.5, 1);

    if (this.state === 'menu') {
      this.menuTime += this.deltaTime;
      for (const s of this.stars) {
        s.y += s.speed * this.deltaTime;
        if (s.y > this.canvas.height) s.y = 0;
      }
      return;
    }

    if (this.state !== 'playing') return;

    this.grid.update(this.deltaTime);
    for (const a of this.agents) a.update(this.deltaTime);

    const pc = this.agents[0].getCurrentCell();
    if (this.grid.collectItem(pc)) {
      this.score += 10;
      this.particles.push({ x: pc.worldX + this.cellSize / 2, y: pc.worldY, alpha: 1, text: '+10' });
      this.updateHud();
    }
    this.particles = this.particles.filter(p => { p.y -= 40 * this.deltaTime; p.alpha -= this.deltaTime * 1.5; return p.alpha > 0; });

    if (this.agents[0].getCurrentCell() === this.goalCell) { this.triggerSuccess(); return; }
    for (let i = 1; i < this.numAgents; i++) {
      if (this.agents[i].getCurrentCell() === pc) { this.triggerGameOver(); return; }
    }

    this.enemyUpdateTimer += this.deltaTime;
    if (this.enemyUpdateTimer >= this.enemyUpdateInterval) { this.recalcEnemies(); this.enemyUpdateTimer = 0; }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private updateHud() {
    const dr = this.agents[0]?.getDashCooldownRatio?.() ?? 0;
    const dashBar = dr > 0
      ? `<span style="color:#f80">Dash cooldown: ${(dr * 100).toFixed(0)}%</span>`
      : `<span style="color:#0f8">Dash: Pronto (Shift)</span>`;
    this.hudElement.innerHTML = `
      <span style="font-size:17px;font-weight:bold;color:#ffd700">⭐ ${this.score}</span>
      &nbsp;|&nbsp;${dashBar}
      &nbsp;|&nbsp;<span style="color:#aef">Espaço=Pular · D=Debug</span><br>
      <small>Player: ${this.currentPlayerAlgorithm} (1-4) &nbsp;|&nbsp; Inimigos: ${this.currentEnemyAlgorithm} (Q/W/E/R)</small>`;
  }

  // ── Render dispatcher ──────────────────────────────────────────────────────

  private render() {
    if (this.state === 'menu')     { this.renderMenu(); return; }
    this.renderGameplay();
    if (this.state === 'gameover') { this.renderOverlay('gameover'); }
    if (this.state === 'success')  { this.renderOverlay('success'); }
  }

  // ── Gameplay ───────────────────────────────────────────────────────────────

  private renderGameplay() {
    const ctx = this.ctx;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.grid.render(ctx);

    const sa = this.agents[this.selectedAgentIndex];
    const path = sa.getPath();
    const pi   = sa.getPathIndex();
    path.forEach((cell, idx) => {
      if (idx <= pi) return;
      ctx.fillStyle = idx === pi + 1 ? '#ff0' : '#0f0';
      ctx.fillRect(cell.worldX + 10, cell.worldY + 10, this.cellSize - 20, this.cellSize - 20);
    });

    for (const a of this.agents) a.render(ctx, this.cellSize);
    this.drawX(ctx, this.goalCell, '#fff');

    const sg = this.agentGoals[this.selectedAgentIndex];
    if (sg && sg !== this.goalCell) this.drawX(ctx, sg, '#ff0');

    if (this.debugMode) {
      ctx.fillStyle = '#fff'; ctx.font = '8px Arial';
      for (let y = 0; y < this.grid.rows; y++)
        for (let x = 0; x < this.grid.cols; x++) {
          const c = this.grid.cells[y][x];
          ctx.fillText(`${c.f}`, c.worldX + 5, c.worldY + 15);
        }
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 16px Arial';
      ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x - 12, p.y);
      ctx.restore();
    }
    this.updateHud();
  }

  private drawX(ctx: CanvasRenderingContext2D, cell: Cell, color: string) {
    const { worldX: wx, worldY: wy } = cell;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx + 5, wy + 5); ctx.lineTo(wx + this.cellSize - 5, wy + this.cellSize - 5);
    ctx.moveTo(wx + this.cellSize - 5, wy + 5); ctx.lineTo(wx + 5, wy + this.cellSize - 5);
    ctx.stroke();
  }

  // ── Menu ───────────────────────────────────────────────────────────────────

  private renderMenu() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const t = this.menuTime;

    // Background
    ctx.fillStyle = '#08081a';
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of this.stars) {
      const a = 0.35 + Math.sin(t * 1.2 + s.x * 0.01) * 0.25;
      ctx.fillStyle = `rgba(190,210,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    // Nebula glow blobs
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
    const pw = 520, ph = 570, px = W / 2 - pw / 2, py = 50;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#0d0d22';
    drawRoundedRect(ctx, px, py, pw, ph, 20); ctx.fill();
    // border gradient
    const borderG = ctx.createLinearGradient(px, py, px + pw, py + ph);
    borderG.addColorStop(0, '#7744cc'); borderG.addColorStop(1, '#2244aa');
    ctx.strokeStyle = borderG; ctx.lineWidth = 2;
    drawRoundedRect(ctx, px, py, pw, ph, 20); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';

    // Subtitle
    ctx.font = '13px monospace';
    ctx.fillStyle = '#9966ff';
    ctx.fillText('◈  PATHFINDING QUEST  ◈', W / 2, py + 56);

    // Main title with pulse
    const pulse = 1 + Math.sin(t * 2) * 0.015;
    ctx.save();
    ctx.translate(W / 2, py + 118);
    ctx.scale(pulse, pulse);
    ctx.font = 'bold 58px monospace';
    const tg = ctx.createLinearGradient(-200, 0, 200, 0);
    tg.addColorStop(0, '#cc88ff'); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(1, '#88aaff');
    ctx.fillStyle = tg;
    ctx.shadowColor = '#7722ff'; ctx.shadowBlur = 30;
    ctx.fillText('MAZE RUN', 0, 0);
    ctx.restore();

    // Divider
    ctx.strokeStyle = '#331166'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 40, py + 148); ctx.lineTo(px + pw - 40, py + 148); ctx.stroke();

    // Enemy algorithm label
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#8888bb';
    ctx.fillText('— ALGORITMO DOS INIMIGOS —', W / 2, py + 180);

    ctx.restore();

    // Render buttons
    for (const b of this.buttons) this.drawBtn(ctx, b, b === this.buttons[0]);

    // Current selection readout
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(130,110,200,0.7)';
    ctx.fillText(`Selecionado: ${this.currentEnemyAlgorithm}`, W / 2, py + ph - 14);
    ctx.fillStyle = 'rgba(120,120,170,0.45)';
    ctx.fillText('Clique no mapa para mover · Shift=Dash · Espaço=Pular · D=Debug', W / 2, H - 18);
    ctx.restore();
  }

  // ── Overlay (GameOver / Success) ───────────────────────────────────────────

  private renderOverlay(type: 'gameover' | 'success') {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const a = this.overlayAlpha;

    // Tinted backdrop
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    ctx.fillStyle = type === 'gameover' ? '#110008' : '#050f01';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    if (a < 0.25) return;

    // Confetti for success
    if (type === 'success') {
      const confettiColors = ['#ffd700','#ff88aa','#88ffcc','#aaaaff','#ff8800','#88ffff'];
      ctx.save();
      ctx.globalAlpha = a * 0.65;
      for (let i = 0; i < 70; i++) {
        const cx = ((Math.sin(i * 2.39) * 0.5 + 0.5) * W + this.overlayTimer * (i % 2 === 0 ? 28 : -28)) % W;
        const cy = ((this.overlayTimer * 55 + i * 97) % H);
        ctx.fillStyle = confettiColors[i % confettiColors.length];
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.overlayTimer + i);
        ctx.fillRect(-3, -3, 7, 7); ctx.restore();
      }
      ctx.restore();
    }

    // Panel fade-in
    const panelAlpha = Math.max(0, (a - 0.25) / 0.75);
    const pw = 440, ph = 290, px = W / 2 - pw / 2, py = H / 2 - ph / 2 - 60;

    ctx.save();
    ctx.globalAlpha = panelAlpha;

    ctx.fillStyle = type === 'gameover' ? '#180610' : '#081408';
    drawRoundedRect(ctx, px, py, pw, ph, 18); ctx.fill();
    ctx.strokeStyle = type === 'gameover' ? '#cc2244' : '#44cc66';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, px, py, pw, ph, 18); ctx.stroke();

    ctx.textAlign = 'center';

    if (type === 'gameover') {
      ctx.font = 'bold 54px monospace';
      ctx.fillStyle = '#ff3355';
      ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 28;
      ctx.fillText('GAME OVER', W / 2, py + 74);
    } else {
      ctx.font = 'bold 46px monospace';
      const tg = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
      tg.addColorStop(0, '#ffd700'); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(1, '#88ffaa');
      ctx.fillStyle = tg;
      ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 26;
      ctx.fillText('STAGE CLEAR!', W / 2, py + 68);
      ctx.shadowBlur = 0;
      ctx.font = '26px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('★  ★  ★', W / 2, py + 108);
    }

    // Divider
    ctx.shadowBlur = 0;
    ctx.strokeStyle = type === 'gameover' ? '#440011' : '#113311';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 30, py + 125); ctx.lineTo(px + pw - 30, py + 125); ctx.stroke();

    // Score
    ctx.font = '14px monospace';
    ctx.fillStyle = type === 'gameover' ? '#cc8899' : '#88bb88';
    ctx.fillText('PONTUAÇÃO FINAL', W / 2, py + 158);

    ctx.font = 'bold 46px monospace';
    const sg = ctx.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, 0);
    sg.addColorStop(0, type === 'gameover' ? '#ff8899' : '#ffd700');
    sg.addColorStop(1, type === 'gameover' ? '#ffccaa' : '#aaffcc');
    ctx.fillStyle = sg;
    ctx.fillText(`${this.endScore}`, W / 2, py + 224);

    ctx.restore();

    // Buttons appear after panel is mostly visible
    if (panelAlpha > 0.5) {
      ctx.save();
      ctx.globalAlpha = (panelAlpha - 0.5) / 0.5;
      for (const b of this.buttons) this.drawBtn(ctx, b, b === this.buttons[0]);
      ctx.restore();
    }
  }

  // ── Button renderer ────────────────────────────────────────────────────────

  private drawBtn(ctx: CanvasRenderingContext2D, btn: Button, isPrimary: boolean) {
    const isAlgBtn = !isPrimary;
    const isSelected = isAlgBtn && btn.label === this.currentEnemyAlgorithm;

    ctx.save();
    if (btn.hovered || isSelected) {
      ctx.shadowColor = isPrimary ? '#aa66ff' : '#4488ff';
      ctx.shadowBlur = 16;
    }

    if (isPrimary) {
      const g = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
      g.addColorStop(0, btn.hovered ? '#9955ff' : '#7733cc');
      g.addColorStop(1, btn.hovered ? '#6633bb' : '#441199');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = isSelected
        ? 'rgba(70,50,170,0.92)'
        : btn.hovered ? 'rgba(55,35,130,0.85)' : 'rgba(25,15,70,0.72)';
    }
    drawRoundedRect(ctx, btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();

    ctx.strokeStyle = isSelected ? '#9977ff' : isPrimary ? '#aa77ff' : '#332266';
    ctx.lineWidth = isSelected ? 2 : 1;
    drawRoundedRect(ctx, btn.x, btn.y, btn.w, btn.h, 10); ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = btn.hovered || isSelected ? '#ffffff' : isPrimary ? '#ddbbff' : '#9988cc';
    ctx.font = isPrimary ? 'bold 18px monospace' : '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }
}