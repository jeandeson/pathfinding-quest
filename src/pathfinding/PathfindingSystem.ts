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
}

export class PathfindingSystem {
  constructor(private readonly grid: Grid) {}

  findPath(
    start: Cell,
    goal:  Cell,
    algorithm: PathfindingAlgorithm
  ): Cell[] | null {
    if (!start.walkable || !goal.walkable) return null;

    this.grid.resetPathfindingData();

    switch (algorithm) {
      case PathfindingAlgorithm.AStar:    return this.aStar(start, goal);
      case PathfindingAlgorithm.Dijkstra: return this.dijkstra(start, goal);
      case PathfindingAlgorithm.BFS:      return this.bfs(start, goal);
      case PathfindingAlgorithm.DFS:      return this.dfs(start, goal);
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
