// src/entities/Enemy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Inimigo: segue um caminho de pathfinding em direção ao jogador.
// Classe simples — toda a lógica de movimento está no Agent base.
// Se no futuro precisar de comportamentos especiais (flanking, etc.),
// basta sobrescrever os métodos aqui sem afetar o Agent.
// ─────────────────────────────────────────────────────────────────────────────

import { Agent, AgentOptions } from '../entities/Agent';

export class Enemy extends Agent {
  constructor(opts: AgentOptions) {
    super(opts);
  }

  // Inimigos podem ter glow vermelho ao perseguir — fácil de estender
  protected override applyGlow(_ctx: CanvasRenderingContext2D): void {
    // Ex. futuro: if (this.isMoving) { ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 8; }
  }
}
