// src/pathfinding/types.ts

export interface Cell {
  x: number;
  y: number;
  walkable: boolean;
  worldX: number;
  worldY: number;
  /** A* / Dijkstra cost fields — reset before each search */
  f: number;
  g: number;
  h: number;
  parent: Cell | null;
  hasItem?: boolean;
}

export enum PathfindingAlgorithm {
  AStar    = 'A*',
  Dijkstra = 'Dijkstra',
  BFS      = 'BFS',
  DFS      = 'DFS',
  JPS      = 'JPS',
}

/**
 * Nome de exibição padronizado dos algoritmos (interface, gráficos e tabelas).
 * O DFS implementado é a variante adotada no trabalho — DFS-Greedy: os vizinhos
 * são ordenados pela distância de Manhattan antes de empilhar. O valor do enum
 * continua 'DFS' porque é a chave gravada no benchmark_results.csv.
 */
export function algorithmLabel(alg: string): string {
  return alg === PathfindingAlgorithm.DFS ? 'DFS-Greedy' : alg;
}

export const ALL_ALGORITHMS = [
  PathfindingAlgorithm.AStar,
  PathfindingAlgorithm.Dijkstra,
  PathfindingAlgorithm.BFS,
  PathfindingAlgorithm.DFS,
  PathfindingAlgorithm.JPS,
] as const;