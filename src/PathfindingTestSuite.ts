// src/PathfindingTestSuite.ts
import { Grid, PathfindingAlgorithm, Cell } from "./grid";

type TestResult = {
  testName: string;
  algorithm: PathfindingAlgorithm;
  gridSize: string;
  obstacleDensity: number;
  npcCount: number;
  pathLength: number;
  nodesVisited: number;
  timeMs: number;
  success: boolean;
};

export class PathfindingTestSuite {
  private results: TestResult[] = [];

  /** Executa um teste isolado e registra métricas */
  private runSingleTest(
    testName: string,
    algo: PathfindingAlgorithm,
    grid: Grid,
    start: Cell,
    goal: Cell,
    obstacleDensity: number,
    npcCount = 1
  ) {
    let nodesVisited = 0;
    const originalGetNeighbors = grid.getNeighbors.bind(grid);
    grid.getNeighbors = (cell: Cell) => {
      nodesVisited++;
      return originalGetNeighbors(cell);
    };

    const startTime = performance.now();
    const path = grid.findPath(start, goal, algo);
    const endTime = performance.now();

    this.results.push({
      testName,
      algorithm: algo,
      gridSize: `${grid.rows}x${grid.cols}`,
      obstacleDensity,
      npcCount,
      pathLength: path ? path.length : 0,
      nodesVisited,
      timeMs: parseFloat((endTime - startTime).toFixed(3)),
      success: !!path,
    });
  }

  // ========================================================
  // 4.1.1 — Mapas com diferentes densidades de obstáculos
  // ========================================================
  public testObstacleConfigurations() {
    const sizes = [
      { rows: 20, cols: 20 },
      { rows: 40, cols: 40 },
    ];
    const obstacleDensities = [0.1, 0.2, 0.3, 0.4];
    const algorithms = [
      PathfindingAlgorithm.AStar,
      PathfindingAlgorithm.Dijkstra,
      PathfindingAlgorithm.BFS,
      PathfindingAlgorithm.DFS,
    ];

    for (const size of sizes) {
      for (const density of obstacleDensities) {
        const grid = new Grid(size.rows, size.cols, 20);
        grid.generateObstacles(density);
        const start = grid.cells[0][0];
        const goal = grid.cells[size.rows - 1][size.cols - 1];

        for (const algo of algorithms) {
          this.runSingleTest("Mapas com Obstáculos", algo, grid, start, goal, density);
        }
      }
    }
  }

  // ========================================================
  // 4.1.2 — Testes de desempenho com múltiplos NPCs
  // ========================================================

  /** Escalabilidade: aumenta número de NPCs */
  public testScalability() {
    const grid = new Grid(50, 50, 10);
    grid.generateObstacles(0.2);
    const algorithms = [PathfindingAlgorithm.AStar, PathfindingAlgorithm.Dijkstra];
    const npcCounts = [1, 5, 10, 20, 50];

    for (const algo of algorithms) {
      for (const count of npcCounts) {
        const start = grid.cells[0][0];
        const goal = grid.cells[grid.rows - 1][grid.cols - 1];
        this.runSingleTest("Escalabilidade", algo, grid, start, goal, 0.2, count);
      }
    }
  }

  /** Congestionamento: muitos NPCs na mesma passagem estreita */
  public testCongestion() {
    const grid = new Grid(30, 30, 10);
    const algorithms = [PathfindingAlgorithm.AStar];
    const chokeLevels = [0.2, 0.4, 0.6];

    for (const choke of chokeLevels) {
      grid.generateObstacles(0); // limpa o grid
      for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
          if (Math.random() < choke && x !== Math.floor(grid.cols / 2)) {
            grid.cells[y][x].walkable = false;
          }
        }
      }

      const start = grid.cells[0][Math.floor(grid.cols / 2)];
      const goal = grid.cells[grid.rows - 1][Math.floor(grid.cols / 2)];

      for (const algo of algorithms) {
        this.runSingleTest("Congestionamento", algo, grid, start, goal, choke);
      }
    }
  }

  /** Objetivos Dinâmicos: destino muda durante o percurso */
  public testDynamicGoals() {
    const grid = new Grid(40, 40, 10);
    grid.generateObstacles(0.25);
    const algorithms = [PathfindingAlgorithm.AStar];

    for (const algo of algorithms) {
      const start = grid.cells[0][0];
      let goal = grid.cells[grid.rows - 1][grid.cols - 1];

      this.runSingleTest("Objetivo Dinâmico (Etapa 1)", algo, grid, start, goal, 0.25);

      goal = grid.cells[Math.floor(grid.rows / 2)][Math.floor(grid.cols / 2)];
      this.runSingleTest("Objetivo Dinâmico (Etapa 2)", algo, grid, start, goal, 0.25);
    }
  }

  // ========================================================
  // Execução e Exportação
  // ========================================================

  /** Executa todos os testes experimentais */
  public runAll() {
    console.log("🧠 Iniciando bateria de testes científicos...");
    this.testObstacleConfigurations();
    this.testScalability();
    this.testCongestion();
    this.testDynamicGoals();
    console.log("✅ Todos os testes concluídos.");
  }

  /** Exibe tabela no console */
  public logResults() {
    console.table(this.results);
  }

  /** Exporta resultados como JSON */
  public exportJSON(): string {
    return JSON.stringify(this.results, null, 2);
  }

  /** Exporta resultados como CSV (para usar no artigo) */
  public exportCSV(): string {
    const headers = Object.keys(this.results[0]).join(",");
    const rows = this.results
      .map((r) =>
        [
          r.testName,
          r.algorithm,
          r.gridSize,
          r.obstacleDensity,
          r.npcCount,
          r.pathLength,
          r.nodesVisited,
          r.timeMs,
          r.success,
        ].join(",")
      )
      .join("\n");
    return headers + "\n" + rows;
  }

  /** Gera gráficos (opcional — se rodar em ambiente browser com Chart.js) */
  public generateCharts(containerId: string) {
    // Exemplo: precisa de <canvas id="chart"></canvas> no HTML
    // Usa Chart.js, caso disponível globalmente
    if (typeof (window as any).Chart === "undefined") {
      console.warn("Chart.js não encontrado. Gráficos não gerados.");
      return;
    }

    const ctx = (document.getElementById(containerId) as HTMLCanvasElement)?.getContext("2d");
    if (!ctx) return;

    const filtered = this.results.filter((r) => r.testName === "Mapas com Obstáculos");
    const grouped = this.groupBy(filtered, "algorithm");

    const datasets = Object.keys(grouped).map((algo) => ({
      label: algo,
      data: grouped[algo].map((r) => ({ x: r.obstacleDensity, y: r.timeMs })),
      borderWidth: 2,
    }));

    new (window as any).Chart(ctx, {
      type: "line",
      data: {
        datasets,
      },
      options: {
        scales: {
          x: { title: { display: true, text: "Densidade de Obstáculos" } },
          y: { title: { display: true, text: "Tempo (ms)" } },
        },
      },
    });
  }

  private groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const group = String(item[key]);
      acc[group] = acc[group] || [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}
