// src/ui/HUD.ts
import { PathfindingAlgorithm } from '../pathfinding/types';

/**
 * Manages the HTML overlay HUD (score, dash cooldown, controls hint).
 * Keeps DOM manipulation out of game/scene logic.
 */
export class HUD {
  private el: HTMLDivElement;

  constructor() {
    this.el = (document.getElementById('hud') as HTMLDivElement | null)
      ?? (() => {
        const d = document.createElement('div');
        d.id = 'hud';
        Object.assign(d.style, {
          marginTop: '10px', textAlign: 'center',
          color: 'white', fontFamily: 'Arial, sans-serif',
          pointerEvents: 'none', userSelect: 'none',
        });
        document.body.appendChild(d);
        return d;
      })();
  }

  show(): void  { this.el.style.display = 'block'; }
  hide(): void  { this.el.style.display = 'none';  }

  update(opts: {
    score: number;
    dashCooldownRatio: number;
    playerAlg: PathfindingAlgorithm;
    enemyAlg:  PathfindingAlgorithm;
  }): void {
    const { score, dashCooldownRatio, playerAlg, enemyAlg } = opts;
    const dashReady = dashCooldownRatio <= 0;
    const dashLabel = dashReady
      ? `<span style="color:#0f8">Dash: Pronto (Shift)</span>`
      : `<span style="color:#f80">Dash: ${(dashCooldownRatio * 100).toFixed(0)}%</span>`;

    this.el.innerHTML = `
      <span style="font-size:17px;font-weight:bold;color:#ffd700">⭐ ${score}</span>
      &nbsp;|&nbsp;${dashLabel}
      &nbsp;|&nbsp;<span style="color:#aef">Espaço = Pular · D = Debug</span><br>
      <small>
        Player: <b>${playerAlg}</b> (1–5)
        &nbsp;|&nbsp;
        Inimigos: <b>${enemyAlg}</b> (Q/W/E/R/T)
      </small>`;
  }
}
