// src/scenes/Scene.ts
// ─────────────────────────────────────────────────────────────────────────────
// Contrato que toda cena do jogo deve implementar.
// O SceneManager chama esses métodos no momento certo.
// ─────────────────────────────────────────────────────────────────────────────

export interface IScene {
  /** Chamado uma vez quando a cena torna-se ativa */
  onEnter(): void;

  /** Chamado uma vez quando a cena é desativada */
  onExit(): void;

  /** Lógica de atualização (dt em segundos) */
  update(dt: number): void;

  /** Renderização */
  render(ctx: CanvasRenderingContext2D): void;
}
