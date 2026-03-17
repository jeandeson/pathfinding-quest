// src/core/AssetManager.ts

/**
 * Centralised image loader with cache.
 * Prevents duplicate requests and gives a single preload point.
 *
 * Usage:
 *   await AssetManager.preload({ sheep: 'src/assets/…/sheep.png', … });
 *   const img = AssetManager.get('sheep');
 */
export class AssetManager {
  private static cache = new Map<string, HTMLImageElement>();

  /** Load a named map of image paths. Resolves when all are ready. */
  static preload(manifest: Record<string, string>): Promise<void> {
    const pending = Object.entries(manifest).map(([key, src]) => {
      if (this.cache.has(key)) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload  = () => { this.cache.set(key, img); resolve(); };
        img.onerror = () => {
          console.warn(`[AssetManager] Failed to load "${src}" (key: ${key}). Using fallback.`);
          // Store a 1x1 transparent image so downstream code never gets null
          const blank = new Image();
          this.cache.set(key, blank);
          resolve();
        };
        img.src = src;
      });
    });
    return Promise.all(pending).then(() => undefined);
  }

  /** Retrieve a loaded image by key. Throws if not preloaded. */
  static get(key: string): HTMLImageElement {
    const img = this.cache.get(key);
    if (!img) throw new Error(`[AssetManager] Asset "${key}" not loaded. Call preload() first.`);
    return img;
  }

  /** Check if an asset is available (loaded & complete). */
  static has(key: string): boolean {
    return this.cache.has(key);
  }
}
