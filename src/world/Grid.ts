// src/world/Grid.ts
// ─────────────────────────────────────────────────────────────────────────────
// Responsabilidade única: gerenciar os DADOS do mapa (células, obstáculos,
// itens). Rendering e pathfinding vivem em módulos separados.
// ─────────────────────────────────────────────────────────────────────────────

import { Cell } from './Cell';
import { GameConfig } from '../config/GameConfig';

const { ROWS, COLS, CELL_SIZE } = GameConfig.GRID;

export class Grid {
  public readonly rows: number;
  public readonly cols: number;
  public readonly cellSize: number;
  public readonly cells: Cell[][];

  constructor(rows = ROWS, cols = COLS, cellSize = CELL_SIZE) {
    this.rows     = rows;
    this.cols     = cols;
    this.cellSize = cellSize;
    this.cells    = this.buildCells();
    this.generateObstacles(GameConfig.GRID.OBSTACLE_DENSITY);
  }

  // ── Construção ─────────────────────────────────────────────────────────────

  private buildCells(): Cell[][] {
    return Array.from({ length: this.rows }, (_, y) =>
      Array.from({ length: this.cols }, (_, x) => ({
        x, y,
        walkable: true,
        hasItem:  false,
        worldX:   x * this.cellSize,
        worldY:   y * this.cellSize,
        f: 0, g: 0, h: 0,
        parent: null,
      }))
    );
  }

  // ── Geração de obstáculos ──────────────────────────────────────────────────

  /**
   * Gera obstáculos e garante que [0,0] e [cols-1,rows-1] estejam conectados.
   * Tenta até MAX_RETRIES vezes antes de usar fallback sem obstáculos.
   */
  public generateObstacles(density: number): void {
    const MAX_RETRIES = 10;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      this.placeObstacles(density);
      if (this.bfsConnected(0, 0, this.cols - 1, this.rows - 1)) return;
    }
    // Fallback: mapa totalmente aberto
    for (const row of this.cells)
      for (const c of row) { c.walkable = true; c.hasItem = false; }
    this.spawnItems(GameConfig.GRID.ITEM_COUNT);
  }

  private placeObstacles(density: number): void {
    // Reset
    for (const row of this.cells)
      for (const c of row) { c.walkable = true; c.hasItem = false; }

    // Bloco central de obstáculos
    const yS = Math.floor(this.rows / 3);
    const yE = Math.min(this.rows, yS + Math.floor(this.rows / 3));
    const xS = Math.floor(this.cols / 3);
    const xE = Math.min(this.cols, xS + Math.floor(this.cols / 3));
    for (let y = yS; y < yE; y++)
      for (let x = xS; x < xE; x++)
        this.cells[y][x].walkable = false;

    // Obstáculos aleatórios (respeitando as pontas)
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++)
        if (Math.random() < density && !this.isCorner(x, y))
          this.cells[y][x].walkable = false;

    // Garante que cantos iniciais e finais são transitáveis
    this.cells[0][0].walkable                         = true;
    this.cells[this.rows - 1][this.cols - 1].walkable = true;

    this.spawnItems(GameConfig.GRID.ITEM_COUNT);
  }

  private isCorner(x: number, y: number): boolean {
    return (x === 0 && y === 0) || (x === this.cols - 1 && y === this.rows - 1);
  }

  // ── Garantia de conectividade ──────────────────────────────────────────────

  /**
   * Garante que todas as células da lista são mutuamente acessíveis a partir
   * de required[0]. Se alguma estiver isolada, escava um corredor mínimo em L.
   * Deve ser chamado após forçar células de spawn como walkable.
   */
  public guaranteeConnected(required: { x: number; y: number }[]): void {
    if (required.length < 2) return;
    const anchor = required[0];
    let reachable = this.bfsReachableSet(anchor.x, anchor.y);

    for (let i = 1; i < required.length; i++) {
      const { x, y } = required[i];
      if (!reachable.has(y * this.cols + x)) {
        this.carvePath(x, y, anchor.x, anchor.y);
        // Re-run BFS para incluir novos nós escavados
        reachable = this.bfsReachableSet(anchor.x, anchor.y);
      }
    }
  }

  // ── BFS internos ──────────────────────────────────────────────────────────

  private bfsConnected(sx: number, sy: number, gx: number, gy: number): boolean {
    if (!this.cells[sy]?.[sx]?.walkable || !this.cells[gy]?.[gx]?.walkable) return false;
    const visited = new Uint8Array(this.rows * this.cols);
    const queue   = [sy * this.cols + sx];
    const goal    = gy * this.cols + gx;
    visited[sy * this.cols + sx] = 1;
    while (queue.length > 0) {
      const idx = queue.shift()!;
      if (idx === goal) return true;
      const cy = Math.floor(idx / this.cols);
      const cx = idx % this.cols;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = cx + dx, ny = cy + dy;
        const ni = ny * this.cols + nx;
        if (this.isValid(nx, ny) && this.cells[ny][nx].walkable && !visited[ni]) {
          visited[ni] = 1;
          queue.push(ni);
        }
      }
    }
    return false;
  }

  private bfsReachableSet(startX: number, startY: number): Set<number> {
    const visited = new Set<number>();
    if (!this.isValid(startX, startY) || !this.cells[startY][startX].walkable) return visited;
    const start = startY * this.cols + startX;
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const idx = queue.shift()!;
      const cy  = Math.floor(idx / this.cols);
      const cx  = idx % this.cols;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = cx + dx, ny = cy + dy;
        const ni = ny * this.cols + nx;
        if (this.isValid(nx, ny) && this.cells[ny][nx].walkable && !visited.has(ni)) {
          visited.add(ni);
          queue.push(ni);
        }
      }
    }
    return visited;
  }

  /** Escava um corredor em L de (fromX,fromY) até (toX,toY). */
  private carvePath(fromX: number, fromY: number, toX: number, toY: number): void {
    let cx = fromX, cy = fromY;
    while (cx !== toX || cy !== toY) {
      this.cells[cy][cx].walkable = true;
      if (cx !== toX) cx += cx < toX ? 1 : -1;
      else             cy += cy < toY ? 1 : -1;
    }
    this.cells[toY][toX].walkable = true;
  }

  // ── Itens ──────────────────────────────────────────────────────────────────

  private spawnItems(count: number): void {
    let spawned = 0, tries = 0;
    while (spawned < count && tries++ < 500) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      const c = this.cells[y][x];
      if (c.walkable && !c.hasItem && !this.isCorner(x, y)) {
        c.hasItem = true;
        spawned++;
      }
    }
  }

  /** Coleta o item da célula. Retorna true se havia um item. */
  public collectItem(cell: Cell): boolean {
    if (!cell.hasItem) return false;
    cell.hasItem = false;
    return true;
  }

  // ── Topologia ──────────────────────────────────────────────────────────────

  public isValid(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  public getNeighbors(cell: Cell): Cell[] {
    const result: Cell[] = [];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cell.x + dx, ny = cell.y + dy;
      if (this.isValid(nx, ny) && this.cells[ny][nx].walkable)
        result.push(this.cells[ny][nx]);
    }
    return result;
  }

  public getCellAt(x: number, y: number): Cell | null {
    return this.isValid(x, y) ? this.cells[y][x] : null;
  }

  public getCellFromPixel(px: number, py: number): Cell | null {
    return this.getCellAt(Math.floor(px / this.cellSize), Math.floor(py / this.cellSize));
  }

  /** Reseta os campos de busca sem criar novas células */
  public resetPathfindingData(): void {
    for (const row of this.cells)
      for (const c of row) { c.f = c.g = c.h = 0; c.parent = null; }
  }
}
