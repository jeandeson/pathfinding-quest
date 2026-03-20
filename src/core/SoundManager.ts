// src/core/SoundManager.ts
// ─────────────────────────────────────────────────────────────────────────────
// Gerencia efeitos sonoros e músicas do jogo.
//   • Efeitos (play):  clona o nó original → permite sobreposição simultânea.
//   • Música (playMusic): faixa única em loop; troca para a nova automaticamente.
// ─────────────────────────────────────────────────────────────────────────────

export class SoundManager {
  // ── Efeitos sonoros ───────────────────────────────────────────────────────
  private static sfxPool   = new Map<string, HTMLAudioElement>();

  // ── Música ────────────────────────────────────────────────────────────────
  private static musicSrc  = new Map<string, string>();
  private static currentMusic: HTMLAudioElement | null = null;

  // ── Preload ───────────────────────────────────────────────────────────────

  /** Registra e pré-carrega efeitos sonoros (chave → caminho). */
  static preload(manifest: Record<string, string>): void {
    for (const [key, src] of Object.entries(manifest)) {
      const audio = new Audio(src);
      audio.load();
      this.sfxPool.set(key, audio);
    }
  }

  /** Registra músicas de fundo (chave → caminho). Não carrega até tocar. */
  static preloadMusic(manifest: Record<string, string>): void {
    for (const [key, src] of Object.entries(manifest))
      this.musicSrc.set(key, src);
  }

  // ── Efeitos ───────────────────────────────────────────────────────────────

  /** Toca um efeito. Clona o nó para permitir sobreposição. */
  static play(key: string, volume = 1): void {
    const original = this.sfxPool.get(key);
    if (!original) return;
    const audio = original.cloneNode() as HTMLAudioElement;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
  }

  // ── Música ────────────────────────────────────────────────────────────────

  /**
   * Inicia uma música em loop. Para qualquer faixa anterior imediatamente.
   * Chamar novamente com a mesma chave reinicia do início.
   */
  static playMusic(key: string, volume = 0.4): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic = null;
    }
    const src = this.musicSrc.get(key);
    if (!src) return;
    const music   = new Audio(src);
    music.loop    = true;
    music.volume  = Math.max(0, Math.min(1, volume));
    music.play().catch(() => {});
    this.currentMusic = music;
  }

  /** Para a música atual. */
  static stopMusic(): void {
    if (!this.currentMusic) return;
    this.currentMusic.pause();
    this.currentMusic = null;
  }
}
