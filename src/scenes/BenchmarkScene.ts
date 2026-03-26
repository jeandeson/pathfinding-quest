// src/scenes/BenchmarkScene.ts
import type { IScene }       from './Scene';
import { InputManager }      from '../core/InputManager';
import { BenchmarkRunner, BenchmarkProgress } from '../benchmarks/BenchmarkRunner';
import { BenchmarkResult }   from '../benchmarks/BenchmarkResult';
import { PathfindingAlgorithm } from '../pathfinding/PathfindingSystem';
import {
  drawBarChart,
  drawLineChart,
  ALGO_COLORS,
} from '../rendering/ChartRenderer';
import { Button } from '../ui/Button';

type Tab = 'density' | 'scalability' | 'congestion' | 'dynamic' | 'summary';

const TABS: { id: Tab; label: string }[] = [
  { id: 'density',     label: '① Obstáculos' },
  { id: 'scalability', label: '② Escalabilidade' },
  { id: 'congestion',  label: '③ Congestionamento' },
  { id: 'dynamic',     label: '④ Obj. Dinâmicos' },
  { id: 'summary',     label: '⑤ Resumo' },
];

export class BenchmarkScene implements IScene {
  private running    = false;
  private done       = false;
  private progress: BenchmarkProgress = { completed: 0, total: 70, current: 'Aguardando...' };
  private results:   BenchmarkResult[] = [];
  private activeTab: Tab = 'density';

  private buttons:    Button[] = [];
  private tabButtons: Button[] = [];
  private unsubs:     Array<() => void> = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    _ctx: CanvasRenderingContext2D,
    private readonly input:  InputManager,
    private readonly onMenu: () => void,
  ) {}

  onEnter(): void {
    this.canvas.width  = 1280;
    this.canvas.height = 960;
    this.done    = false;
    this.running = false;
    this.results = [];
    this.buildButtons();
    this.registerInput();
  }

  onExit(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }

  // ── Botões ─────────────────────────────────────────────────────────────────

  private buildButtons(): void {
    const W = this.canvas.width, H = this.canvas.height;

    this.buttons = [
      new Button({ label: '▶ Executar Testes', cx: W / 2 - 110, cy: H - 38, w: 210, h: 44, primary: true }, () => this.runTests()),
      new Button({ label: '← Menu',            cx: 72,          cy: H - 38, w: 110, h: 44 },               () => this.onMenu()),
    ];

    // 5 abas uniformemente distribuídas em 1280px
    this.tabButtons = TABS.map((tab, i) =>
      new Button(
        { label: tab.label, cx: 152 + i * 244, cy: 32, w: 228, h: 36 },
        () => { this.activeTab = tab.id; this.updateTabSelection(); },
      )
    );
    this.updateTabSelection();
  }

  private updateTabSelection(): void {
    this.tabButtons.forEach((btn, i) => { btn.selected = TABS[i].id === this.activeTab; });
  }

  private registerInput(): void {
    this.unsubs.push(
      this.input.onClick(({ x, y }) => {
        for (const b of [...this.buttons, ...this.tabButtons])
          if (b.contains(x, y)) { b.click(); return; }
      }),
      this.input.onMove(({ x, y }) => {
        for (const b of [...this.buttons, ...this.tabButtons])
          b.hovered = b.contains(x, y);
      }),
    );
  }

  // ── Execução ───────────────────────────────────────────────────────────────

  private async runTests(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.done    = false;
    this.results = [];
    const runner = new BenchmarkRunner();
    this.results = await runner.run(p => { this.progress = p; });
    this.running = false;
    this.done    = true;
  }

  // ── Loop ───────────────────────────────────────────────────────────────────

  update(_dt: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = '#08081a';
    ctx.fillRect(0, 0, W, H);

    this.drawHeader(ctx, W);

    if (!this.done) {
      this.drawWelcome(ctx, W, H);
    } else {
      this.drawTabs(ctx);
      this.drawActiveTab(ctx, W, H);
    }
    this.drawFooter(ctx, W, H);
  }

  // ── Header / Footer / Welcome ──────────────────────────────────────────────

  private drawHeader(ctx: CanvasRenderingContext2D, W: number): void {
    ctx.fillStyle = 'rgba(15,15,35,0.95)';
    ctx.fillRect(0, 0, W, 56);
    ctx.fillStyle    = '#cc99ff';
    ctx.font         = 'bold 18px monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('◈ PATHFINDING BENCHMARK', 20, 34);
  }

  private drawWelcome(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const cx = W / 2;
    if (this.running) {
      const ratio = this.progress.total > 0 ? this.progress.completed / this.progress.total : 0;
      const barW = 480, barH = 22;
      ctx.fillStyle = '#1a1a3a';
      ctx.fillRect(cx - barW / 2, H / 2, barW, barH);
      ctx.fillStyle = '#66aaff';
      ctx.fillRect(cx - barW / 2, H / 2, barW * ratio, barH);
      ctx.fillStyle    = '#fff';
      ctx.font         = '14px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(this.progress.current, cx, H / 2 - 12);
      ctx.fillStyle = 'rgba(180,175,220,0.85)';
      ctx.font      = '12px monospace';
      ctx.fillText(`${this.progress.completed} / ${this.progress.total} testes`, cx, H / 2 + barH + 18);
      return;
    }
    ctx.fillStyle    = '#9977cc';
    ctx.font         = '14px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Clique em "Executar Testes" para iniciar os benchmarks.', cx, H / 2);
  }

  private drawTabs(ctx: CanvasRenderingContext2D): void {
    for (const btn of this.tabButtons) btn.render(ctx);
  }

  private drawFooter(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = 'rgba(12,12,28,0.95)';
    ctx.fillRect(0, H - 60, W, 60);
    for (const b of this.buttons) b.render(ctx);
  }

  // ── Conteúdo das abas ──────────────────────────────────────────────────────

  private drawActiveTab(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const contentY = 68;
    const contentH = H - 68 - 80;

    switch (this.activeTab) {

      // ① Obstáculos — gráfico de linha: densidade × tempo
      case 'density':
        drawLineChart(ctx,
          { x: 20, y: contentY, w: W - 40, h: contentH, title: 'Impacto da Densidade de Obstáculos', subtitle: 'Grid 20×20 — Tempo médio por densidade' },
          this.results.filter(r => r.gridSize === '20x20' && r.testName === 'Densidades de Obstáculos'),
          'obstacleDensity', 'timeMs', 'Tempo (ms)',
        );
        break;

      // ② Escalabilidade — gráfico de linha + Tabela 2
      case 'scalability': {
        const chartH  = Math.floor(contentH * 0.42);
        const tableY  = contentY + chartH + 14;
        const scalRes = this.results.filter(r => r.testName === 'Escalabilidade (NPCs)');

        drawLineChart(ctx,
          { x: 20, y: contentY, w: W - 40, h: chartH, title: 'Escalabilidade de NPCs', subtitle: 'Grid 20×20, Densidade 0.2 — Tempo total vs. nº de NPCs' },
          scalRes, 'npcCount', 'timeMs', 'Tempo Total (ms)',
        );

        const algos = Object.values(PathfindingAlgorithm);
        const rows = algos.map(alg => {
          const ar = scalRes.filter(r => r.algorithm === alg);
          if (!ar.length) return null;
          return [
            alg,
            this.avg(ar.map(r => r.pathLength)).toFixed(1),
            this.avg(ar.map(r => r.nodesVisited)).toFixed(0),
            this.avg(ar.map(r => r.timeMs)).toFixed(3),
          ];
        }).filter(Boolean) as string[][];

        this.drawDataTable(ctx, 20, tableY, W - 40,
          'Tabela 2 — Resultados Médios para Múltiplos NPCs (Grid 20×20, Densidade 0.2)',
          'Média entre todos os volumes testados: 1, 5, 10, 20 e 50 NPCs',
          ['Algoritmo', 'Comprimento Médio', 'Nós Visitados', 'Tempo Médio (ms)'],
          rows,
        );
        break;
      }

      // ③ Congestionamento — Tabela 3
      case 'congestion': {
        const congRes = this.results.filter(r => r.testName === 'Congestionamento');
        const algos   = Object.values(PathfindingAlgorithm);

        const rows = algos.map(alg => {
          const ar = congRes.filter(r => r.algorithm === alg);
          if (!ar.length) return null;
          return [
            alg,
            '0.2 – 0.6',
            this.avg(ar.map(r => r.pathLength)).toFixed(1),
            this.avg(ar.map(r => r.nodesVisited)).toFixed(1),
            this.avg(ar.map(r => r.timeMs)).toFixed(3),
          ];
        }).filter(Boolean) as string[][];

        this.drawDataTable(ctx, 20, contentY + 60, W - 40,
          'Tabela 3 — Resultados Médios para Congestionamento (Grid 30×30)',
          'Média entre os níveis de obstrução 0.2, 0.4 e 0.6 — corredor central forçado',
          ['Algoritmo', 'Densidade', 'Comprimento Médio', 'Nós Visitados', 'Tempo Médio (ms)'],
          rows,
        );
        break;
      }

      // ④ Objetivos Dinâmicos — Tabela 4
      case 'dynamic': {
        const dynRes = this.results.filter(r => r.testName.includes('Objetivo Dinâmico'));
        const algos  = [PathfindingAlgorithm.AStar, PathfindingAlgorithm.Dijkstra];
        const rows: string[][] = [];

        for (const alg of algos) {
          for (let s = 1; s <= 3; s++) {
            const r = dynRes.find(d => d.algorithm === alg && d.testName.includes(`Etapa ${s}`));
            if (r) rows.push([
              alg,
              `Etapa ${s}`,
              r.pathLength.toFixed(1),
              r.nodesVisited.toFixed(0),
              r.timeMs.toFixed(3),
            ]);
          }
        }

        this.drawDataTable(ctx, 20, contentY + 60, W - 40,
          'Tabela 4 — Resultados para Objetivos Dinâmicos (Grid 40×40, Densidade 0.25)',
          'Recálculo de caminho para destinos sequenciais — A* e Dijkstra',
          ['Algoritmo', 'Etapa', 'Comprimento', 'Nós Visitados', 'Tempo (ms)'],
          rows,
        );
        break;
      }

      // ⑤ Resumo — gráfico de barras comparativo
      case 'summary':
        drawBarChart(ctx,
          { x: 20, y: contentY, w: W - 40, h: contentH, title: 'Comparativo Geral', subtitle: 'Tempo Médio de Execução (ms) — todos os cenários' },
          this.results,
          'timeMs',
          'Tempo Médio (ms)',
        );
        break;
    }
  }

  // ── Renderização de tabelas ────────────────────────────────────────────────

  private drawDataTable(
    ctx:      CanvasRenderingContext2D,
    x:        number,
    y:        number,
    w:        number,
    title:    string,
    subtitle: string,
    headers:  string[],
    rows:     string[][],
  ): void {
    const TITLE_H = 30;
    const SUB_H   = 24;
    const GAP     = 12;
    const HDR_H   = 48;
    const ROW_H   = 42;
    const colW    = w / headers.length;
    const tableY  = y + TITLE_H + SUB_H + GAP;
    const tableH  = HDR_H + rows.length * ROW_H;

    ctx.save();
    ctx.textBaseline = 'top';

    // Título
    ctx.fillStyle = 'rgba(235,215,255,1.0)';
    ctx.font      = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(title, x, y);

    // Subtítulo
    ctx.fillStyle = 'rgba(195,185,225,0.95)';
    ctx.font      = '14px monospace';
    ctx.fillText(subtitle, x, y + TITLE_H);

    // Fundo do painel
    ctx.fillStyle   = 'rgba(10,10,30,0.88)';
    ctx.strokeStyle = 'rgba(120,100,220,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, tableY, w, tableH, 6);
    ctx.fill();
    ctx.stroke();

    // Cabeçalho
    ctx.fillStyle = 'rgba(55,35,110,0.97)';
    ctx.beginPath();
    ctx.roundRect(x, tableY, w, HDR_H, [6, 6, 0, 0]);
    ctx.fill();

    ctx.fillStyle    = 'rgba(235,215,255,1.0)';
    ctx.font         = 'bold 15px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    headers.forEach((h, i) => {
      ctx.fillText(h, x + i * colW + colW / 2, tableY + HDR_H / 2);
    });

    // Linhas de dados
    rows.forEach((row, ri) => {
      const ry = tableY + HDR_H + ri * ROW_H;

      // Fundo alternado
      if (ri % 2 === 1) {
        ctx.fillStyle = 'rgba(35,25,65,0.5)';
        ctx.fillRect(x, ry, w, ROW_H);
      }

      // Separador horizontal
      ctx.strokeStyle = 'rgba(100,80,180,0.22)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x,     ry + ROW_H);
      ctx.lineTo(x + w, ry + ROW_H);
      ctx.stroke();

      // Células
      ctx.textBaseline = 'middle';
      row.forEach((cell, ci) => {
        const cx = x + ci * colW + colW / 2;
        const cy = ry + ROW_H / 2;

        if (ci === 0) {
          // Coluna de algoritmo — cor identificadora
          ctx.fillStyle = ALGO_COLORS[cell as PathfindingAlgorithm] ?? 'rgba(220,215,240,0.95)';
          ctx.font      = 'bold 15px monospace';
        } else {
          ctx.fillStyle = 'rgba(225,220,245,0.95)';
          ctx.font      = '15px monospace';
        }
        ctx.textAlign = 'center';
        ctx.fillText(cell, cx, cy);
      });
    });

    // Separadores verticais
    ctx.strokeStyle = 'rgba(100,80,180,0.28)';
    ctx.lineWidth   = 1;
    for (let i = 1; i < headers.length; i++) {
      const lx = x + i * colW;
      ctx.beginPath();
      ctx.moveTo(lx, tableY);
      ctx.lineTo(lx, tableY + tableH);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Helpers de dados ───────────────────────────────────────────────────────

  private avg(vals: number[]): number {
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }
}
