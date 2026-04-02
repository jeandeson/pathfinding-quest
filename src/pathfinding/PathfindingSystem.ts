// src/pathfinding/PathfindingSystem.ts
// ─────────────────────────────────────────────────────────────────────────────
// Responsabilidade única: algoritmos de busca de caminho.
// Recebe a Grid como dependência mas não a modifica — exceto os campos de
// busca (f, g, h, parent) que são explicitamente feitos para isso.
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

export class PathfindingSystem {
  /** Número de nós examinados na última chamada a findPath (usado no benchmark do JPS). */
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
    const open:   Cell[]     = [start];
    const closed: Set<Cell>  = new Set();

    start.g = 0;
    start.h = this.heuristic(start, goal);
    start.f = start.h;

    while (open.length > 0) {
      const current = this.extractMin(open, 'f');
      if (current === goal) return this.buildPath(current);

      closed.add(current);

      for (const nb of this.grid.getNeighbors(current)) {
        if (closed.has(nb)) continue;
        const g = current.g + 1;
        if (!open.includes(nb)) open.push(nb);
        else if (g >= nb.g)     continue;
        nb.parent = current;
        nb.g = g;
        nb.h = this.heuristic(nb, goal);
        nb.f = nb.g + nb.h;
      }
    }
    return null;
  }

  // ── Dijkstra ──────────────────────────────────────────────────────────────

  private dijkstra(start: Cell, goal: Cell): Cell[] | null {
    const open:   Cell[]    = [start];
    const closed: Set<Cell> = new Set();
    start.g = 0;

    while (open.length > 0) {
      const current = this.extractMin(open, 'g');
      if (current === goal) return this.buildPath(current);

      closed.add(current);

      for (const nb of this.grid.getNeighbors(current)) {
        if (closed.has(nb)) continue;
        const g = current.g + 1;
        if (!open.includes(nb)) open.push(nb);
        else if (g >= nb.g)     continue;
        nb.parent = current;
        nb.g = g;
        nb.f = g;
      }
    }
    return null;
  }

  // ── BFS ───────────────────────────────────────────────────────────────────

  private bfs(start: Cell, goal: Cell): Cell[] | null {
    const queue:   Cell[]    = [start];
    const visited: Set<Cell> = new Set([start]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === goal) return this.buildPath(current);

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
        // Randomização leve para evitar sempre o mesmo caminho em DFS
        const neighbors = this.grid.getNeighbors(current).sort(() => Math.random() - 0.5);
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
  // Referência: Harabor & Grastien, "Online Graph Pruning for Pathfinding on
  // Grid Maps", AAAI 2011 (doi:10.5555/2900728.2900921).
  //
  // Ideia central: em vez de expandir cada célula individualmente como no A*
  // clássico, o JPS "salta" ao longo de linhas retas até encontrar um
  // "ponto de salto" — uma célula que possui vizinhos forçados (cujo caminho
  // ótimo obrigatoriamente passa pelo nó atual) ou que é o próprio objetivo.
  // Isso reduz drasticamente o número de nós adicionados à lista aberta.

  private jps(start: Cell, goal: Cell): Cell[] | null {
    const open:   Cell[]     = [start];
    const closed: Set<Cell>  = new Set();

    start.g = 0;
    start.h = this.heuristic(start, goal);
    start.f = start.h;

    while (open.length > 0) {
      const current = this.extractMin(open, 'f');
      if (current === goal) return this.buildJPSPath(current);

      closed.add(current);
      this.nodesVisited++;

      for (const [dx, dy] of this.jpsDirections(current)) {
        const jp = this.jpsJump(current.x, current.y, dx, dy, goal);
        if (!jp || closed.has(jp)) continue;

        // Distância entre dois jump points em linha reta = distância Manhattan
        const g = current.g + this.heuristic(current, jp);

        if (!open.includes(jp)) {
          jp.parent = current;
          jp.g      = g;
          jp.h      = this.heuristic(jp, goal);
          jp.f      = jp.g + jp.h;
          open.push(jp);
        } else if (g < jp.g) {
          jp.parent = current;
          jp.g      = g;
          jp.f      = jp.g + jp.h;
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

      this.nodesVisited++;
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

  /** Remove e retorna o nó com menor valor de `field` */
  private extractMin(set: Cell[], field: 'f' | 'g'): Cell {
    let idx = 0;
    for (let i = 1; i < set.length; i++)
      if (set[i][field] < set[idx][field]) idx = i;
    return set.splice(idx, 1)[0];
  }

  private buildPath(goal: Cell): Cell[] {
    const path: Cell[] = [];
    let node: Cell | null = goal;
    while (node) { path.push(node); node = node.parent; }
    return path.reverse();
  }
}
