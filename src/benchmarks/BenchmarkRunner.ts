// src/benchmarks/BenchmarkRunner.ts
// ─────────────────────────────────────────────────────────────────────────────
// Executa os testes de pathfinding de forma ASSÍNCRONA (yield entre suítes)
// para não travar a UI durante a execução. Cada teste roda sobre uma Grid
// isolada — não interfere com o estado do jogo.
//
// Metodologia de medição de tempo:
//   • CONTAGEM e CRONOMETRAGEM são passagens SEPARADAS. As métricas estruturais
//     (pathLength, nodesVisited) são coletadas numa passagem não cronometrada,
//     lendo PathfindingSystem.nodesVisited — que agora é instrumentado dentro do
//     próprio algoritmo, igual para TODOS (sem reescrever getNeighbors). Isso
//     elimina o viés da instrumentação no tempo medido.
//   • A cronometragem usa MEDIÇÃO EM LOTE com calibração automática: cada
//     "unidade de trabalho" (npcCount buscas) é repetida K vezes por leitura de
//     relógio, com K calibrado para que a janela cronometrada exceda
//     MIN_WINDOW_MS. Isso supera o piso de resolução de performance.now() no
//     Chrome (limitado a ~100 µs por mitigação de Spectre), tornando os tempos
//     de buscas sub-milissegundo mensuráveis em vez de ruído de quantização.
// ─────────────────────────────────────────────────────────────────────────────

import { Grid }                                    from '../world/Grid';
import { PathfindingSystem, PathfindingAlgorithm } from '../pathfinding/PathfindingSystem';
import { makeRng }                                 from '../utils/seededRandom';

export interface BenchmarkResult {
  testName:        string;
  algorithm:       PathfindingAlgorithm;
  gridSize:        string;
  obstacleDensity: number;
  npcCount:        number;
  pathLength:      number;
  nodesVisited:    number;
  timeMs:          number;
  timeMsStd:       number;
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
  PathfindingAlgorithm.JPS,
];

// ── Parâmetros de cronometragem ──────────────────────────────────────────────
/** Janela mínima (ms) de cada leitura de relógio — supera o clamp de ~100 µs. */
const MIN_WINDOW_MS = 25;
/** Número de janelas medidas por cenário (base para média e desvio-padrão). */
const ITERATIONS = 10;
/** Repetições de aquecimento (JIT) descartadas antes de medir. */
const WARMUP = 3;
/** Teto de segurança para o fator de repetição em lote. */
const MAX_BATCH = 1 << 22;

/** Calcula média e desvio-padrão de um array de números. */
function stats(values: number[]): { mean: number; std: number } {
  const n    = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { mean, std };
}

const round3 = (v: number) => parseFloat(v.toFixed(3));

/** Cede um frame ao browser antes de continuar — mantém a UI viva */
function yieldFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()));
}

// ─────────────────────────────────────────────────────────────────────────────

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  // ── Núcleo de medição ───────────────────────────────────────────────────────

  /**
   * Executa UMA busca e devolve caminho + nós expandidos (lidos do contador
   * interno do PathfindingSystem). Sem reescrita de getNeighbors → sem viés.
   */
  private runOnce(
    pf: PathfindingSystem, grid: Grid, alg: PathfindingAlgorithm,
    sy: number, sx: number, gy: number, gx: number,
  ): { path: ReturnType<PathfindingSystem['findPath']>; nodesVisited: number } {
    const path = pf.findPath(grid.cells[sy][sx], grid.cells[gy][gx], alg);
    return { path, nodesVisited: pf.nodesVisited };
  }

  /**
   * Cronometra uma unidade de trabalho com calibração de lote.
   * Retorna o tempo POR UNIDADE (média e desvio sobre ITERATIONS janelas).
   */
  private measure(work: () => void): { mean: number; std: number } {
    for (let i = 0; i < WARMUP; i++) work();

    // Calibra K para que K unidades de trabalho excedam MIN_WINDOW_MS.
    let K = 1;
    for (;;) {
      const t0 = performance.now();
      for (let i = 0; i < K; i++) work();
      const e = performance.now() - t0;
      if (e >= MIN_WINDOW_MS || K >= MAX_BATCH) break;
      const target = e > 0 ? Math.ceil(K * (MIN_WINDOW_MS / e) * 1.3) : K * 8;
      K = Math.min(MAX_BATCH, Math.max(K * 2, target));
    }

    const perUnit: number[] = [];
    for (let it = 0; it < ITERATIONS; it++) {
      const t0 = performance.now();
      for (let k = 0; k < K; k++) work();
      perUnit.push((performance.now() - t0) / K);
    }
    return stats(perUnit);
  }

  /**
   * Mede um cenário completo: estrutura (passagem não cronometrada) + tempo
   * (passagem cronometrada em lote). Unidade de trabalho = npcCount buscas
   * idênticas (mesma origem/destino), reproduzindo a semântica histórica em que
   * o tempo reportado para N NPCs é o TOTAL das N buscas.
   */
  private benchScenario(
    pf: PathfindingSystem, grid: Grid, alg: PathfindingAlgorithm,
    sy: number, sx: number, gy: number, gx: number, npcCount: number,
  ): { pathLength: number; nodesVisited: number; timeMs: number; timeMsStd: number; success: boolean } {
    // 1) Estrutura (não cronometrada)
    let nodesTotal = 0, pathLen = 0, success = false;
    for (let n = 0; n < npcCount; n++) {
      const { path, nodesVisited } = this.runOnce(pf, grid, alg, sy, sx, gy, gx);
      nodesTotal += nodesVisited;
      if (path) { pathLen = path.length; success = true; }
    }

    // 2) Tempo (cronometrada, em lote) — unidade = npcCount buscas
    const work = () => {
      for (let n = 0; n < npcCount; n++) pf.findPath(grid.cells[sy][sx], grid.cells[gy][gx], alg);
    };
    const { mean, std } = this.measure(work);

    return {
      pathLength: pathLen,
      nodesVisited: nodesTotal,
      timeMs: round3(mean),
      timeMsStd: round3(std),
      success,
    };
  }

  // ── Suítes de teste ────────────────────────────────────────────────────────

  /** 4.1.1 — Diferentes densidades de obstáculos × tamanhos × algoritmos */
  private suiteObstacleDensity(): BenchmarkResult[] {
    const out: BenchmarkResult[] = [];
    const sizes     = [{ rows: 20, cols: 20 }, { rows: 40, cols: 40 }];
    const densities = [0.1, 0.2, 0.3, 0.4];

    for (const { rows, cols } of sizes) {
      for (const density of densities) {
        const grid = new Grid(rows, cols, 10);
        grid.generateObstacles(density, 1001 + rows + Math.round(density * 100));
        const pf = new PathfindingSystem(grid);

        for (const alg of ALL_ALGORITHMS) {
          const m = this.benchScenario(pf, grid, alg, 0, 0, rows - 1, cols - 1, 1);
          out.push({
            testName: 'Densidades de Obstáculos', algorithm: alg,
            gridSize: `${rows}x${cols}`, obstacleDensity: density, npcCount: 1,
            ...m,
          });
        }
      }
    }
    return out;
  }

  /** 4.1.2 — Escalabilidade: aumenta número de NPCs simultâneos (Grid 20×20) */
  private suiteScalability(): BenchmarkResult[] {
    const out: BenchmarkResult[] = [];
    const grid = new Grid(20, 20, 10);
    grid.generateObstacles(0.2, 2001);
    const pf = new PathfindingSystem(grid);
    const npcCounts = [1, 5, 10, 20, 50];

    for (const alg of ALL_ALGORITHMS) {
      for (const npcCount of npcCounts) {
        const m = this.benchScenario(pf, grid, alg, 0, 0, 19, 19, npcCount);
        out.push({
          testName: 'Escalabilidade (NPCs)', algorithm: alg,
          gridSize: '20x20', obstacleDensity: 0.2, npcCount,
          ...m,
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
      grid.generateObstacles(0, 3000 + Math.round(choke * 1000));
      const mid = Math.floor(grid.cols / 2);
      const rng = makeRng(3000 + Math.round(choke * 1000));

      for (let y = 0; y < grid.rows; y++)
        for (let x = 0; x < grid.cols; x++)
          if (rng() < choke && x !== mid)
            grid.cells[y][x].walkable = false;

      grid.cells[0][mid].walkable             = true;
      grid.cells[grid.rows - 1][mid].walkable = true;

      const pf = new PathfindingSystem(grid);

      for (const alg of ALL_ALGORITHMS) {
        const m = this.benchScenario(pf, grid, alg, 0, mid, grid.rows - 1, mid, 1);
        out.push({
          testName: 'Congestionamento', algorithm: alg,
          gridSize: '30x30', obstacleDensity: choke, npcCount: 1,
          ...m,
        });
      }

      // Testes multi-NPC apenas para choke=0.2 (única densidade com caminho válido)
      if (choke === 0.2) {
        const npcCounts = [5, 10, 20, 50];
        for (const alg of ALL_ALGORITHMS) {
          for (const npcCount of npcCounts) {
            const m = this.benchScenario(pf, grid, alg, 0, mid, grid.rows - 1, mid, npcCount);
            out.push({
              testName: 'Congestionamento', algorithm: alg,
              gridSize: '30x30', obstacleDensity: choke, npcCount,
              ...m,
            });
          }
        }
      }
    }
    return out;
  }

  /** Objetivos dinâmicos — recalcula caminho para destinos diferentes */
  private suiteDynamicGoals(): BenchmarkResult[] {
    const out: BenchmarkResult[] = [];
    const grid = new Grid(40, 40, 10);
    grid.generateObstacles(0.25, 4001);
    const pf = new PathfindingSystem(grid);

    const goals = [
      { y: 39, x: 39, label: 'Objetivo Dinâmico — Etapa 1' },
      { y: 20, x: 20, label: 'Objetivo Dinâmico — Etapa 2' },
      { y:  5, x: 35, label: 'Objetivo Dinâmico — Etapa 3' },
    ];

    const algs = [PathfindingAlgorithm.AStar, PathfindingAlgorithm.Dijkstra, PathfindingAlgorithm.JPS];
    for (const alg of algs) {
      for (const goal of goals) {
        grid.cells[goal.y][goal.x].walkable = true;
        const m = this.benchScenario(pf, grid, alg, 0, 0, goal.y, goal.x, 1);
        out.push({
          testName: goal.label, algorithm: alg,
          gridSize: '40x40', obstacleDensity: 0.25, npcCount: 1,
          ...m,
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
    // density: 2 sizes × 4 densities × 5 algs          = 40
    // scalability: 5 algs × 5 npcCounts                = 25
    // congestion: 5 algs × 3 chokeLevels                = 15
    // congestion multi-NPC: 5 algs × 4 npcCounts        = 20
    // dynamicGoals: 3 algs × 3 goals                    =  9
    return 40 + 25 + 15 + 20 + 9; // = 109
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
