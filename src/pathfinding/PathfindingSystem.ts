// src/pathfinding/PathfindingSystem.ts
// ─────────────────────────────────────────────────────────────────────────────
// Responsabilidade única: algoritmos de busca de caminho.
// Recebe a Grid como dependência mas não a modifica — exceto os campos de
// busca (f, g, h, parent) que são explicitamente feitos para isso.
//
// A* / Dijkstra / JPS usam uma fila de prioridade de heap binário (BinaryHeap),
// garantindo extract-min em O(log n). Combinado com um Set de pertencimento
// O(1), isso eleva a complexidade do laço principal a O((V + E) log V), em vez
// do O(V^2) de uma open list em array com varredura linear.
// ─────────────────────────────────────────────────────────────────────────────

import { Cell } from '../world/Cell';
import { Grid } from '../world/Grid';

export enum PathfindingAlgorithm {
  AStar    = 'A*',
  Dijkstra = 'Dijkstra',
  BFS      = 'BFS',
  DFS      = 'DFS',
  JPS      = 'JPS',
}

// ── Fila de prioridade (heap binário mínimo) ──────────────────────────────────
// Entrada da open list. `key` é o valor de ordenação (f no A*/JPS, g no Dijkstra)
// capturado no momento da inserção; `seq` é um contador monotônico de inserção
// usado APENAS para desempate determinístico (preserva a ordem de descoberta,
// como fazia a varredura linear anterior). Em melhorias de custo (decrease-key)
// uma nova entrada é inserida e a obsoleta é descartada na extração — técnica de
// "lazy deletion", correta sob heurística consistente.
interface HeapEntry {
  cell: Cell;
  key:  number;
  seq:  number;
}

export class BinaryHeap {
  private readonly items: HeapEntry[] = [];

  get size(): number { return this.items.length; }

  push(entry: HeapEntry): void {
    const a = this.items;
    a.push(entry);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.less(a[i], a[p])) { const t = a[i]; a[i] = a[p]; a[p] = t; i = p; }
      else break;
    }
  }

  pop(): HeapEntry | undefined {
    const a = this.items;
    const n = a.length;
    if (n === 0) return undefined;
    const top  = a[0];
    const last = a.pop()!;
    if (n > 1) {
      a[0] = last;
      const len = a.length;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < len && this.less(a[l], a[m])) m = l;
        if (r < len && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        const t = a[i]; a[i] = a[m]; a[m] = t; i = m;
      }
    }
    return top;
  }

  // Ordem: menor key primeiro; empate resolvido pela menor sequência de inserção.
  private less(x: HeapEntry, y: HeapEntry): boolean {
    return x.key < y.key || (x.key === y.key && x.seq < y.seq);
  }
}

export class PathfindingSystem {
  /**
   * Número de nós EXPANDIDOS (extraídos da open list e processados) na última
   * chamada a findPath. Contabiliza expansões — nós cujos sucessores são
   * gerados — de forma uniforme entre todos os algoritmos. No JPS, conta apenas
   * os jump points expandidos, NÃO as células percorridas internamente pela
   * rotina de salto (jump/probe), mantendo a métrica comparável ao conceito de
   * "nodes expanded" da literatura de busca informada.
   */
  public nodesVisited = 0;

  constructor(private readonly grid: Grid) {}

  findPath(
    start: Cell,
    goal:  Cell,
    algorithm: PathfindingAlgorithm
  ): Cell[] | null {
    if (!start.walkable || !goal.walkable) return null;

    this.grid.resetPathfindingData();
    this.nodesVisited = 0;

    switch (algorithm) {
      case PathfindingAlgorithm.AStar:    return this.aStar(start, goal);
      case PathfindingAlgorithm.Dijkstra: return this.dijkstra(start, goal);
      case PathfindingAlgorithm.BFS:      return this.bfs(start, goal);
      case PathfindingAlgorithm.DFS:      return this.dfs(start, goal);
      case PathfindingAlgorithm.JPS:      return this.jps(start, goal);
    }
  }

  // ── A* ────────────────────────────────────────────────────────────────────

  private aStar(start: Cell, goal: Cell): Cell[] | null {
    const open   = new BinaryHeap();
    const closed = new Set<Cell>();
    const seen   = new Set<Cell>();
    let   seq    = 0;

    start.g = 0;
    start.h = this.heuristic(start, goal);
    start.f = start.g + start.h;
    open.push({ cell: start, key: start.f, seq: seq++ });
    seen.add(start);

    while (open.size > 0) {
      const current = open.pop()!.cell;
      if (closed.has(current)) continue;          // entrada obsoleta (lazy deletion)
      if (current === goal) return this.buildPath(current);

      closed.add(current);
      this.nodesVisited++;

      for (const nb of this.grid.getNeighbors(current)) {
        if (closed.has(nb)) continue;
        const g = current.g + 1;
        if (!seen.has(nb) || g < nb.g) {
          nb.parent = current;
          nb.g = g;
          nb.h = this.heuristic(nb, goal);
          nb.f = nb.g + nb.h;
          seen.add(nb);
          open.push({ cell: nb, key: nb.f, seq: seq++ });
        }
      }
    }
    return null;
  }

  // ── Dijkstra ──────────────────────────────────────────────────────────────

  private dijkstra(start: Cell, goal: Cell): Cell[] | null {
    const open   = new BinaryHeap();
    const closed = new Set<Cell>();
    const seen   = new Set<Cell>();
    let   seq    = 0;

    start.g = 0;
    start.f = 0;
    open.push({ cell: start, key: start.g, seq: seq++ });
    seen.add(start);

    while (open.size > 0) {
      const current = open.pop()!.cell;
      if (closed.has(current)) continue;
      if (current === goal) return this.buildPath(current);

      closed.add(current);
      this.nodesVisited++;

      for (const nb of this.grid.getNeighbors(current)) {
        if (closed.has(nb)) continue;
        const g = current.g + 1;
        if (!seen.has(nb) || g < nb.g) {
          nb.parent = current;
          nb.g = g;
          nb.f = g;
          seen.add(nb);
          open.push({ cell: nb, key: nb.g, seq: seq++ });
        }
      }
    }
    return null;
  }

  // ── BFS ───────────────────────────────────────────────────────────────────

  private bfs(start: Cell, goal: Cell): Cell[] | null {
    // Fila FIFO implementada com índice de head para evitar o custo O(n)
    // do Array.prototype.shift() em JavaScript. Com shift(), o BFS
    // degrada para O(V^2) por re-alocar todo o array a cada dequeue;
    // com índice de head, mantém-se a complexidade canônica O(V + E).
    const queue:   Cell[]    = [start];
    let   head               = 0;
    const visited: Set<Cell> = new Set([start]);

    while (head < queue.length) {
      const current = queue[head++];
      if (current === goal) return this.buildPath(current);

      this.nodesVisited++;

      for (const nb of this.grid.getNeighbors(current)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          nb.parent = current;
          queue.push(nb);
        }
      }
    }
    return null;
  }

  // ── DFS ───────────────────────────────────────────────────────────────────

  private dfs(start: Cell, goal: Cell): Cell[] | null {
    const MAX_DEPTH = this.grid.rows * this.grid.cols;
    const stack:   { cell: Cell; depth: number }[] = [{ cell: start, depth: 0 }];
    const visited: Set<Cell>                        = new Set([start]);
    const cameFrom: Map<Cell, Cell>                 = new Map();

    while (stack.length > 0) {
      const { cell: current, depth } = stack.pop()!;

      if (current === goal) {
        const path: Cell[] = [];
        let tmp: Cell | null = current;
        while (tmp) { path.push(tmp); tmp = cameFrom.get(tmp) ?? null; }
        return path.reverse();
      }

      if (depth < MAX_DEPTH) {
        this.nodesVisited++;
        // Vizinhos ordenados do mais distante ao mais próximo (Manhattan).
        // Stack é LIFO → o mais próximo fica no topo e é expandido primeiro.
        // Isso é DFS guiado por heurística (Greedy DFS): mantém a estrutura
        // de pilha e a incompletude do DFS puro, mas direciona a busca para
        // evitar caminhos que se afastam indefinidamente do objetivo.
        const neighbors = this.grid.getNeighbors(current)
          .sort((a, b) => this.heuristic(b, goal) - this.heuristic(a, goal));
        for (const nb of neighbors) {
          if (!visited.has(nb)) {
            visited.add(nb);
            cameFrom.set(nb, current);
            stack.push({ cell: nb, depth: depth + 1 });
          }
        }
      }
    }
    return null;
  }

  // ── JPS (Jump Point Search) ───────────────────────────────────────────────
  // Implementação para grade 4-direcional (cardeal) com movimentos uniformes.
  // Inspirada em Harabor & Grastien, "Online Graph Pruning for Pathfinding on
  // Grid Maps", AAAI 2011 (doi:10.5555/2900728.2900921), cuja formulação
  // original pressupõe movimento em 8 direções (com diagonais). Esta é uma
  // ADAPTAÇÃO 4-conexa: como não há saltos diagonais, a detecção de pontos de
  // curva exige uma sondagem perpendicular linear (jpsProbe) a cada célula da
  // varredura. As regras de poda e a otimalidade foram, portanto, validadas
  // empiricamente para esta variante (ver verify_invariants.mjs), não herdadas
  // diretamente da prova de Harabor & Grastien.
  //
  // Ideia central: em vez de expandir cada célula individualmente como no A*
  // clássico, o JPS "salta" ao longo de linhas retas até encontrar um
  // "ponto de salto" — uma célula que possui vizinhos forçados (cujo caminho
  // ótimo obrigatoriamente passa pelo nó atual) ou que é o próprio objetivo.
  // Isso reduz drasticamente o número de nós adicionados à lista aberta.

  private jps(start: Cell, goal: Cell): Cell[] | null {
    const open   = new BinaryHeap();
    const closed = new Set<Cell>();
    const seen   = new Set<Cell>();
    let   seq    = 0;

    start.g = 0;
    start.h = this.heuristic(start, goal);
    start.f = start.g + start.h;
    open.push({ cell: start, key: start.f, seq: seq++ });
    seen.add(start);

    while (open.size > 0) {
      const current = open.pop()!.cell;
      if (closed.has(current)) continue;
      if (current === goal) return this.buildJPSPath(current);

      closed.add(current);
      this.nodesVisited++;

      for (const [dx, dy] of this.jpsDirections(current)) {
        const jp = this.jpsJump(current.x, current.y, dx, dy, goal);
        if (!jp || closed.has(jp)) continue;

        // Distância entre dois jump points em linha reta = distância Manhattan
        const g = current.g + this.heuristic(current, jp);

        if (!seen.has(jp) || g < jp.g) {
          jp.parent = current;
          jp.g      = g;
          jp.h      = this.heuristic(jp, goal);
          jp.f      = jp.g + jp.h;
          seen.add(jp);
          open.push({ cell: jp, key: jp.f, seq: seq++ });
        }
      }
    }
    return null;
  }

  /**
   * Retorna as direções de busca a partir de um nó, aplicando as regras de
   * poda do JPS para grades 4-direcionais.
   *
   * Sem pai → busca em todas as 4 direções cardeais.
   * Com pai → mantém a direção natural e adiciona direções de vizinhos forçados.
   *
   * Vizinho forçado: nó que só pode ser atingido de forma ótima passando pelo
   * nó atual (há um obstáculo que bloqueia o caminho direto a partir do pai).
   */
  private jpsDirections(node: Cell): [number, number][] {
    if (!node.parent) {
      return [[0, -1], [0, 1], [-1, 0], [1, 0]];
    }

    const dx = Math.sign(node.x - node.parent.x);
    const dy = Math.sign(node.y - node.parent.y);

    // Em grades 4-direcionais, ao expandir um jump point devemos sempre
    // explorar as direções perpendiculares — não apenas quando há vizinho
    // forçado — porque o próprio jump point pode ter sido identificado via
    // verificação recursiva perpendicular (sem obstáculo próximo).
    if (dx !== 0) return [[dx, 0], [0, 1], [0, -1]];
    else          return [[0, dy], [1, 0], [-1, 0]];
  }

  /**
   * Salta iterativamente a partir de (x, y) na direção (dx, dy).
   * Retorna o primeiro jump point encontrado, ou null se bater em obstáculo/borda.
   *
   * Em grades 4-direcionais, uma célula (cx, cy) é jump point se:
   *   1. É o objetivo; OU
   *   2. Possui vizinho forçado; OU
   *   3. Uma sondagem perpendicular simples a partir dela encontra o objetivo
   *      ou um vizinho forçado (necessário para detectar pontos de curva em
   *      corredores sem obstáculos próximos).
   */
  private jpsJump(x: number, y: number, dx: number, dy: number, goal: Cell): Cell | null {
    let cx = x + dx;
    let cy = y + dy;

    while (true) {
      if (!this.grid.isValid(cx, cy) || !this.grid.cells[cy][cx].walkable) return null;

      const cell = this.grid.cells[cy][cx];

      if (cell === goal) return cell;
      if (this.jpsHasForced(cx, cy, dx, dy)) return cell;

      // Sondagem perpendicular linear (sem recursão — evita explosão exponencial)
      if (dx !== 0) {
        if (this.jpsProbe(cx, cy, 0,  1, goal)) return cell;
        if (this.jpsProbe(cx, cy, 0, -1, goal)) return cell;
      } else {
        if (this.jpsProbe(cx, cy,  1, 0, goal)) return cell;
        if (this.jpsProbe(cx, cy, -1, 0, goal)) return cell;
      }

      cx += dx;
      cy += dy;
    }
  }

  /**
   * Sondagem linear simples em linha reta a partir de (x, y) na direção (dx, dy).
   * Retorna true se encontrar o objetivo ou uma célula com vizinho forçado.
   * Não faz chamadas recursivas — usada para detectar jump points perpendiculares.
   */
  private jpsProbe(x: number, y: number, dx: number, dy: number, goal: Cell): boolean {
    let cx = x + dx;
    let cy = y + dy;
    while (this.grid.isValid(cx, cy) && this.grid.cells[cy][cx].walkable) {
      if (this.grid.cells[cy][cx] === goal)           return true;
      if (this.jpsHasForced(cx, cy, dx, dy))          return true;
      cx += dx;
      cy += dy;
    }
    return false;
  }

  /**
   * Verifica se a célula (x, y), alcançada movendo-se na direção (dx, dy),
   * possui pelo menos um vizinho forçado — indicando que é um jump point.
   */
  private jpsHasForced(x: number, y: number, dx: number, dy: number): boolean {
    if (dx !== 0) {
      if (this.walkable(x, y + 1) && !this.walkable(x - dx, y + 1)) return true;
      if (this.walkable(x, y - 1) && !this.walkable(x - dx, y - 1)) return true;
    } else {
      if (this.walkable(x + 1, y) && !this.walkable(x + 1, y - dy)) return true;
      if (this.walkable(x - 1, y) && !this.walkable(x - 1, y - dy)) return true;
    }
    return false;
  }

  /** Verifica se (x, y) está dentro da grade e é transitável. */
  private walkable(x: number, y: number): boolean {
    return this.grid.isValid(x, y) && this.grid.cells[y][x].walkable;
  }

  /**
   * Reconstrói o caminho completo a partir dos jump points, interpolando as
   * células intermediárias para que o agente possa se mover célula a célula.
   */
  private buildJPSPath(goal: Cell): Cell[] {
    const jumpPoints: Cell[] = [];
    let node: Cell | null = goal;
    while (node) { jumpPoints.push(node); node = node.parent; }
    jumpPoints.reverse();

    const fullPath: Cell[] = [];
    for (let i = 0; i < jumpPoints.length - 1; i++) {
      const from = jumpPoints[i];
      const to   = jumpPoints[i + 1];
      fullPath.push(from);

      // Caminha em linha reta de `from` até `to` (sempre cardeal em 4-dir)
      const sdx = Math.sign(to.x - from.x);
      const sdy = Math.sign(to.y - from.y);
      let cx = from.x + sdx;
      let cy = from.y + sdy;
      while (cx !== to.x || cy !== to.y) {
        fullPath.push(this.grid.cells[cy][cx]);
        cx += sdx;
        cy += sdy;
      }
    }
    fullPath.push(jumpPoints[jumpPoints.length - 1]);
    return fullPath;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private heuristic(a: Cell, b: Cell): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan
  }

  private buildPath(goal: Cell): Cell[] {
    const path: Cell[] = [];
    let node: Cell | null = goal;
    while (node) { path.push(node); node = node.parent; }
    return path.reverse();
  }
}
