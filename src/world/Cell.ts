// src/world/Cell.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tipos puros de dados do mundo — sem lógica, sem dependências.
// ─────────────────────────────────────────────────────────────────────────────

export interface Cell {
  readonly x: number;
  readonly y: number;
  walkable: boolean;
  readonly worldX: number;
  readonly worldY: number;
  hasItem: boolean;
  // Campos mutáveis usados APENAS durante buscas (resetados antes de cada busca)
  f: number;
  g: number;
  h: number;
  parent: Cell | null;
}
