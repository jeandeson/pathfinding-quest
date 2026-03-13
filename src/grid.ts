// grid.ts

export interface Cell {
  x: number;
  y: number;
  walkable: boolean;
  worldX: number;
  worldY: number;
  f: number;
  g: number;
  h: number;
  parent: Cell | null;
  hasItem?: boolean; // gold collectible
};

export enum PathfindingAlgorithm {
  AStar = 'AStar',
  Dijkstra = 'Dijkstra',
  BFS = 'BFS',
  DFS = 'DFS',
}

export class Grid {
  public rows: number;
  public cols: number;
  private cellSize: number;
  public cells: Cell[][];

  // Assets
  private tileset: HTMLImageElement;
  private obstacleSprite: HTMLImageElement;
  private tilesetLoaded: boolean = false;
  private obstacleLoaded: boolean = false;

  private readonly TILE_SOURCE_SIZE = 16;
  private groundSourceX = 16;
  private groundSourceY = 16;

  // Gold item animation
  private itemPulse: number = 0;

  constructor(rows: number, cols: number, cellSize: number) {
    this.rows = rows;
    this.cols = cols;
    this.cellSize = cellSize;

    this.tileset = new Image();
    this.tileset.src = 'src/assets/Tilesets/Grass.png';
    this.tileset.onload = () => this.tilesetLoaded = true;

    this.obstacleSprite = new Image();
    this.obstacleSprite.src = 'src/assets/Objects/Egg_item.png';
    this.obstacleSprite.onload = () => this.obstacleLoaded = true;

    this.cells = this.createCells();
    this.generateObstacles(0.2);
  }

  private createCells(): Cell[][] {
    const cells: Cell[][] = [];
    for (let y = 0; y < this.rows; y++) {
      cells[y] = [];
      for (let x = 0; x < this.cols; x++) {
        cells[y][x] = {
          x, y,
          walkable: true,
          worldX: x * this.cellSize,
          worldY: y * this.cellSize,
          f: 0, g: 0, h: 0,
          parent: null,
          hasItem: false,
        };
      }
    }
    return cells;
  }

  public generateObstacles(density: number): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.cells[y][x].walkable = true;
        this.cells[y][x].hasItem = false;
      }
    }

    const yStart = Math.floor(this.rows / 3);
    const yEnd = Math.min(this.rows, yStart + Math.floor(this.rows / 3));
    const xStart = Math.floor(this.cols / 3);
    const xEnd = Math.min(this.cols, xStart + Math.floor(this.cols / 3));

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        this.cells[y][x].walkable = false;
      }
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (Math.random() < density && !(y === 0 && x === 0) && !(y === this.rows - 1 && x === this.cols - 1)) {
          this.cells[y][x].walkable = false;
        }
      }
    }

    this.cells[0][0].walkable = true;
    this.cells[this.rows - 1][this.cols - 1].walkable = true;

    // Scatter gold items on walkable cells (avoid corners)
    this.spawnItems(12);
  }

  public spawnItems(count: number): void {
    let spawned = 0;
    let attempts = 0;
    while (spawned < count && attempts < 500) {
      attempts++;
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      const cell = this.cells[y][x];
      if (cell.walkable && !cell.hasItem && !(x === 0 && y === 0) && !(x === this.cols - 1 && y === this.rows - 1)) {
        cell.hasItem = true;
        spawned++;
      }
    }
  }

  /** Collect item at cell. Returns true if item was there. */
  public collectItem(cell: Cell): boolean {
    if (cell.hasItem) {
      cell.hasItem = false;
      return true;
    }
    return false;
  }

  public isValid(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  public getNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    for (const dir of dirs) {
      const nx = cell.x + dir.x;
      const ny = cell.y + dir.y;
      if (this.isValid(nx, ny) && this.cells[ny][nx].walkable) {
        neighbors.push(this.cells[ny][nx]);
      }
    }
    return neighbors;
  }

  private heuristic(a: Cell, b: Cell): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getLowestFNode(openSet: Cell[]): Cell {
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) lowestIndex = i;
    }
    return openSet.splice(lowestIndex, 1)[0];
  }

  private getLowestGNode(openSet: Cell[]): Cell {
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].g < openSet[lowestIndex].g) lowestIndex = i;
    }
    return openSet.splice(lowestIndex, 1)[0];
  }

  public resetCells(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.cells[y][x];
        cell.f = cell.g = cell.h = 0;
        cell.parent = null;
      }
    }
  }

  private reconstructPath(goal: Cell): Cell[] {
    const path: Cell[] = [];
    let temp: Cell | null = goal;
    while (temp) {
      path.push(temp);
      temp = temp.parent;
    }
    return path.reverse();
  }

  public findPath(start: Cell, goal: Cell, algorithm: PathfindingAlgorithm): Cell[] | null {
    this.resetCells();
    if (algorithm === PathfindingAlgorithm.AStar) return this.aStar(start, goal);
    if (algorithm === PathfindingAlgorithm.Dijkstra) return this.dijkstra(start, goal);
    if (algorithm === PathfindingAlgorithm.BFS) return this.bfs(start, goal);
    if (algorithm === PathfindingAlgorithm.DFS) return this.dfs(start, goal);
    return null;
  }

  private aStar(start: Cell, goal: Cell): Cell[] | null {
    const openSet: Cell[] = [start];
    const closedSet: Set<Cell> = new Set();
    start.g = 0;
    start.h = this.heuristic(start, goal);
    start.f = start.g + start.h;
    while (openSet.length > 0) {
      const current = this.getLowestFNode(openSet);
      if (current === goal) return this.reconstructPath(current);
      closedSet.add(current);
      for (const neighbor of this.getNeighbors(current)) {
        if (closedSet.has(neighbor)) continue;
        const tentativeG = current.g + 1;
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
        else if (tentativeG >= neighbor.g) continue;
        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = this.heuristic(neighbor, goal);
        neighbor.f = neighbor.g + neighbor.h;
      }
    }
    return null;
  }

  private dijkstra(start: Cell, goal: Cell): Cell[] | null {
    const openSet: Cell[] = [start];
    const closedSet: Set<Cell> = new Set();
    start.g = 0;
    while (openSet.length > 0) {
      const current = this.getLowestGNode(openSet);
      if (current === goal) return this.reconstructPath(current);
      closedSet.add(current);
      for (const neighbor of this.getNeighbors(current)) {
        if (closedSet.has(neighbor)) continue;
        const tentativeG = current.g + 1;
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
        else if (tentativeG >= neighbor.g) continue;
        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.f = neighbor.g;
      }
    }
    return null;
  }

  private bfs(start: Cell, goal: Cell): Cell[] | null {
    const queue: Cell[] = [start];
    const visited: Set<Cell> = new Set([start]);
    start.g = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === goal) return this.reconstructPath(current);
      for (const neighbor of this.getNeighbors(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          neighbor.parent = current;
          neighbor.g = current.g + 1;
          queue.push(neighbor);
        }
      }
    }
    return null;
  }

  private dfs(start: Cell, goal: Cell): Cell[] | null {
    const stack: { cell: Cell; depth: number }[] = [{ cell: start, depth: 0 }];
    const visited: Set<Cell> = new Set([start]);
    const cameFrom: Map<Cell, Cell> = new Map();
    const MAX_DEPTH = this.rows * this.cols;
    while (stack.length > 0) {
      const { cell: current, depth } = stack.pop()!;
      if (current === goal) {
        const path: Cell[] = [];
        let temp: Cell | null = current;
        while (temp) {
          path.push(temp);
          temp = cameFrom.get(temp) || null;
        }
        return path.reverse();
      }
      if (depth < MAX_DEPTH) {
        for (const neighbor of this.getNeighbors(current).sort(() => Math.random() - 0.5)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            cameFrom.set(neighbor, current);
            stack.push({ cell: neighbor, depth: depth + 1 });
          }
        }
      }
    }
    return null;
  }

  public update(deltaTime: number): void {
    this.itemPulse += deltaTime * 3;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.cells[y][x];

        if (this.tilesetLoaded) {
          ctx.drawImage(
            this.tileset,
            this.groundSourceX, this.groundSourceY, this.TILE_SOURCE_SIZE, this.TILE_SOURCE_SIZE,
            cell.worldX, cell.worldY, this.cellSize, this.cellSize
          );
        } else {
          ctx.fillStyle = '#222';
          ctx.fillRect(cell.worldX, cell.worldY, this.cellSize, this.cellSize);
        }

        if (!cell.walkable) {
          if (this.obstacleLoaded) {
            ctx.drawImage(this.obstacleSprite, cell.worldX, cell.worldY, this.cellSize, this.cellSize);
          } else {
            ctx.fillStyle = '#f00';
            ctx.fillRect(cell.worldX, cell.worldY, this.cellSize, this.cellSize);
          }
        }

        // Draw gold collectible
        if (cell.hasItem) {
          const pulse = 0.85 + Math.sin(this.itemPulse + x * 0.7 + y * 1.1) * 0.15;
          const r = (this.cellSize * 0.22) * pulse;
          const cx = cell.worldX + this.cellSize / 2;
          const cy = cell.worldY + this.cellSize / 2;

          // Glow
          ctx.save();
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 10 * pulse;

          const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
          grad.addColorStop(0, '#fff9aa');
          grad.addColorStop(0.5, '#ffd700');
          grad.addColorStop(1, '#b8860b');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          // Star sparkle
          ctx.strokeStyle = 'rgba(255,255,200,0.8)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.itemPulse * 0.5;
            const inner = r * 1.2;
            const outer = r * 1.7;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
            ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.strokeStyle = 'rgba(68, 68, 68, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.worldX, cell.worldY, this.cellSize, this.cellSize);
      }
    }
  }

  public getCellFromPixel(px: number, py: number): Cell | null {
    const x = Math.floor(px / this.cellSize);
    const y = Math.floor(py / this.cellSize);
    if (this.isValid(x, y)) return this.cells[y][x];
    return null;
  }
}