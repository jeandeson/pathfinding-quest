// src/benchmark/BenchmarkResult.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dados puros do sistema de benchmark.
// Sem dependências — pode ser importado em qualquer lugar.
// ─────────────────────────────────────────────────────────────────────────────

import { PathfindingAlgorithm } from '../pathfinding/PathfindingSystem';

// ── Resultado de um único teste ────────────────────────────────────────────

export interface BenchmarkResult {
  testName:        string;
  algorithm:       PathfindingAlgorithm;
  gridSize:        string;          // ex.: "20x20"
  obstacleDensity: number;          // 0.0 – 1.0
  npcCount:        number;
  pathLength:      number;          // 0 = sem caminho
  nodesVisited:    number;
  timeMs:          number;
  success:         boolean;
}

// ── Agrupamento para gráficos ──────────────────────────────────────────────

export type ResultsByAlgorithm = Record<PathfindingAlgorithm, BenchmarkResult[]>;

// ── Definição de uma suite de testes ──────────────────────────────────────

export interface TestSuiteDefinition {
  name:        string;           // nome exibido na UI
  description: string;          // subtítulo / tooltip
  run:         () => BenchmarkJob[];
}

// ── Job: unidade mínima de trabalho (1 findPath) ──────────────────────────
// O BenchmarkRunner executa um job por frame para não travar o loop.

export interface BenchmarkJob {
  suiteName:       string;
  algorithm:       PathfindingAlgorithm;
  gridRows:        number;
  gridCols:        number;
  obstacleDensity: number;
  npcCount:        number;
  // Seed opcional para reprodutibilidade (não implementado, reservado)
  seed?:           number;
}
