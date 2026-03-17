// src/benchmark/BenchmarkRunner.ts
// ─────────────────────────────────────────────────────────────────────────────
// Executa os testes de pathfinding de forma ASSÍNCRONA (yield entre batches)
// para não travar a UI durante a execução. Cada teste roda sobre uma Grid
// isolada — não interfere com o estado do jogo.
// ─────────────────────────────────────────────────────────────────────────────

import { Grid }                                    from '../world/Grid';
import { PathfindingSystem, PathfindingAlgorithm } from '../pathfinding/PathfindingSystem';

export interface BenchmarkResult {
  testName:        string;
  algorithm:       PathfindingAlgorithm;
  gridSize:        string;
  obstacleDensity: number;
  npcCount:        number;
  pathLength:      number;
  nodesVisited:    number;
  timeMs:          number;
  success:         boolean;
}

export interface BenchmarkProgress {
  completed: number;
  total:     number;
  current:   string;
}

type ProgressCb = (p: BenchmarkProgress) => void;

const ALL_ALGORITHMS = [
  PathfindingAlgorithm.AStar,
  PathfindingAlgorithm.Dijkstra,
  PathfindingAlgorithm.BFS,
  PathfindingAlgorithm.DFS,
];

/** Cede um frame ao browser antes de continuar — mantém a UI viva */
function yieldFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()));
}

/**
 * Executa findPath instrumentando getNeighbors para contar nós visitados.
 * Restaura o método original após a chamada (não-destrutivo).
 */
function runWithCount(
  grid:       Grid,
  pathfinder: PathfindingSystem,
  alg:        PathfindingAlgorithm,
  startY: number, startX: number,
  goalY:  number, goalX:  number,
): { path: ReturnType<PathfindingSystem['findPath']>; nodesVisited: number } {
  let nodesVisited = 0;
  const original   = grid.getNeighbors.bind(grid);

  grid.getNeighbors = (cell) => {
    nodesVisited++;
    return original(cell);
  };

  const path = pathfinder.findPath(
    grid.cells[startY][startX],
    grid.cells[goalY][goalX],
    alg,
  );

  grid.getNeighbors = original;
  return { path, nodesVisited };
}

// ─────────────────────────────────────────────────────────────────────────────

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  // ── Suítes de teste ────────────────────────────────────────────────────────

  /** 4.1.1 — Diferentes densidades de obstáculos × tamanhos × algoritmos */
  private suiteObstacleDensity(): BenchmarkResult[] {
    const out: BenchmarkResult[] = [];
    const sizes     = [{ rows: 20, cols: 20 }, { rows: 40, cols: 40 }];
    const densities = [0.1, 0.2, 0.3, 0.4];

    for (const { rows, cols } of sizes) {
      for (const density of densities) {
        const grid       = new Grid(rows, cols, 10);
        grid.generateObstacles(density);
        const pathfinder = new PathfindingSystem(grid);

        for (const alg of ALL_ALGORITHMS) {
          const t0 = performance.now();
          const { path, nodesVisited } = runWithCount(
            grid, pathfinder, alg, 0, 0, rows - 1, cols - 1,
          );
          out.push({
            testName:        'Densidades de Obstáculos',
            algorithm:       alg,
            gridSize:        `${rows}x${cols}`,
            obstacleDensity: density,
            npcCount:        1,
            pathLength:      path?.length ?? 0,
            nodesVisited,
            timeMs:          parseFloat((performance.now() - t0).toFixed(3)),
            success:         !!path,
          });
        }
      }
    }
    return out;
  }

  /** 4.1.2 — Escalabilidade: aumenta número de NPCs simultâneos (Grid 20×20) */
  private suiteScalability(): BenchmarkResult[] {
    const out: BenchmarkResult[] = [];
    const grid       = new Grid(20, 20, 10);
    grid.generateObstacles(0.2);
    const pathfinder = new PathfindingSystem(grid);
    const npcCounts  = [1, 5, 10, 20, 50];

    for (const alg of ALL_ALGORITHMS) {
      for (const npcCount of npcCounts) {
        const t0       = performance.now();
        let nodesTotal = 0;
        let pathLen    = 0;
        let success    = false;

        for (let n = 0; n < npcCount; n++) {
          const { path, nodesVisited } = runWithCount(
            grid, pathfinder, alg, 0, 0, 19, 19,
          );
          nodesTotal += nodesVisited;
          if (path) { pathLen = path.length; success = true; }
        }

        out.push({
          testName:        'Escalabilidade (NPCs)',
          algorithm:       alg,
          gridSize:        '20x20',
          obstacleDensity: 0.2,
          npcCount,
          pathLength:      pathLen,
          nodesVisited:    nodesTotal,
          timeMs:          parseFloat((performance.now() - t0).toFixed(3)),
          success,
        });
      }
    }
    return out;
  }

  /** Congestionamento — corredor estreito forçado */
  private suiteCongestion(): BenchmarkResult[] {
    const out: BenchmarkResult[] = [];
    const chokeLevels = [0.2, 0.4, 0.6];

    for (const choke of chokeLevels) {
      const grid = new Grid(30, 30, 10);
      grid.generateObstacles(0);
      const mid = Math.floor(grid.cols / 2);

      for (let y = 0; y < grid.rows; y++)
        for (let x = 0; x < grid.cols; x++)
          if (Math.random() < choke && x !== mid)
            grid.cells[y][x].walkable = false;

      grid.cells[0][mid].walkable             = true;
      grid.cells[grid.rows - 1][mid].walkable = true;

      const pathfinder = new PathfindingSystem(grid);

      for (const alg of ALL_ALGORITHMS) {
        const t0 = performance.now();
        const { path, nodesVisited } = runWithCount(
          grid, pathfinder, alg, 0, mid, grid.rows - 1, mid,
        );
        out.push({
          testName:        'Congestionamento',
          algorithm:       alg,
          gridSize:        '30x30',
          obstacleDensity: choke,
          npcCount:        1,
          pathLength:      path?.length ?? 0,
          nodesVisited,
          timeMs:          parseFloat((performance.now() - t0).toFixed(3)),
          success:         !!path,
        });
      }
    }
    return out;
  }

  /** Objetivos dinâmicos — recalcula caminho para destinos diferentes */
  private suiteDynamicGoals(): BenchmarkResult[] {
    const out: BenchmarkResult[] = [];
    const grid = new Grid(40, 40, 10);
    grid.generateObstacles(0.25);
    const pathfinder = new PathfindingSystem(grid);

    const goals = [
      { y: 39, x: 39, label: 'Objetivo Dinâmico — Etapa 1' },
      { y: 20, x: 20, label: 'Objetivo Dinâmico — Etapa 2' },
      { y:  5, x: 35, label: 'Objetivo Dinâmico — Etapa 3' },
    ];

    const algs = [PathfindingAlgorithm.AStar, PathfindingAlgorithm.Dijkstra];
    for (const alg of algs) {
      for (const goal of goals) {
        grid.cells[goal.y][goal.x].walkable = true;
        const t0 = performance.now();
        const { path, nodesVisited } = runWithCount(
          grid, pathfinder, alg, 0, 0, goal.y, goal.x,
        );
        out.push({
          testName:        goal.label,
          algorithm:       alg,
          gridSize:        '40x40',
          obstacleDensity: 0.25,
          npcCount:        1,
          pathLength:      path?.length ?? 0,
          nodesVisited,
          timeMs:          parseFloat((performance.now() - t0).toFixed(3)),
          success:         !!path,
        });
      }
    }
    return out;
  }

  // ── Execução principal (assíncrona) ───────────────────────────────────────

  async run(onProgress: ProgressCb): Promise<BenchmarkResult[]> {
    this.results = [];
    const total  = this.estimateTotal();

    const suites: Array<[string, () => BenchmarkResult[]]> = [
      ['Densidades de Obstáculos', () => this.suiteObstacleDensity()],
      ['Escalabilidade (NPCs)',    () => this.suiteScalability()],
      ['Congestionamento',         () => this.suiteCongestion()],
      ['Objetivos Dinâmicos',      () => this.suiteDynamicGoals()],
    ];

    let completed = 0;
    for (const [label, suite] of suites) {
      onProgress({ completed, total, current: label });
      await yieldFrame();

      const batch = suite();
      this.results.push(...batch);
      completed += batch.length;
    }

    onProgress({ completed, total, current: 'Concluído!' });
    return this.results;
  }

  private estimateTotal(): number {
    // density: 2 sizes × 4 densities × 4 algs = 32
    // scalability: 4 algs × 5 npcCounts       = 20
    // congestion: 4 algs × 3 chokeLevels       = 12
    // dynamicGoals: 2 algs × 3 goals           =  6
    return 32 + 20 + 12 + 6; // = 70
  }

  // ── Exportação ─────────────────────────────────────────────────────────────

  toJSON(): string {
    return JSON.stringify(this.results, null, 2);
  }

  toCSV(): string {
    if (this.results.length === 0) return '';
    const headers = (Object.keys(this.results[0]) as (keyof BenchmarkResult)[]).join(',');
    const rows    = this.results.map(r =>
      (Object.values(r) as (string | number | boolean)[])
        .map(v => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
        .join(',')
    );
    return [headers, ...rows].join('\n');
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }
}
