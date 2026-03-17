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
}

export const ALL_ALGORITHMS = [
  PathfindingAlgorithm.AStar,
  PathfindingAlgorithm.Dijkstra,
  PathfindingAlgorithm.BFS,
  PathfindingAlgorithm.DFS,
] as const;