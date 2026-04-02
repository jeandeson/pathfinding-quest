// src/utils/seededRandom.ts
// ─────────────────────────────────────────────────────────────────────────────
// Gerador pseudo-aleatório determinístico (mulberry32).
// Usado nos benchmarks para garantir que os mapas gerados sejam idênticos
// em toda execução, tornando os resultados reproduzíveis.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna uma função RNG que produz valores em [0, 1) a partir de uma semente
 * inteira. Duas chamadas com a mesma semente produzem a mesma sequência.
 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
