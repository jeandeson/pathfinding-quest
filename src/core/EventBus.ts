// src/core/EventBus.ts

type Handler<T = unknown> = (payload: T) => void;

/**
 * Typed pub/sub event bus.
 * Decouples scenes and systems without direct references.
 *
 * Usage:
 *   bus.on('scene:gameover', ({ score }) => …);
 *   bus.emit('scene:gameover', { score: 120 });
 */
export class EventBus<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Handler<any>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    // Returns an unsubscribe function
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach(h => h(payload));
  }

  /** Remove all listeners (useful on scene teardown). */
  clear(): void {
    this.listeners.clear();
  }
}
