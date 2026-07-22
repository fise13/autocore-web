import { PERSISTENCE_DEBOUNCE_MS, type PersistenceFlushReason } from "./types";

type ScheduledFlush = {
  timer: ReturnType<typeof setTimeout> | null;
  run: (reason: PersistenceFlushReason) => Promise<void>;
};

/**
 * Debounced flush scheduler. Coalesces rapid patches into one flush per key.
 */
export class SaveScheduler {
  private pending = new Map<string, ScheduledFlush>();
  private debounceMs: number;

  constructor(debounceMs = PERSISTENCE_DEBOUNCE_MS) {
    this.debounceMs = debounceMs;
  }

  schedule(key: string, run: (reason: PersistenceFlushReason) => Promise<void>) {
    const existing = this.pending.get(key);
    if (existing?.timer) clearTimeout(existing.timer);

    const entry: ScheduledFlush = {
      timer: null,
      run,
    };
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void entry.run("debounce");
    }, this.debounceMs);
    this.pending.set(key, entry);
  }

  async flush(key: string, reason: PersistenceFlushReason = "manual") {
    const entry = this.pending.get(key);
    if (!entry) return;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    this.pending.delete(key);
    await entry.run(reason);
  }

  async flushAll(reason: PersistenceFlushReason = "manual") {
    const keys = [...this.pending.keys()];
    await Promise.all(keys.map((key) => this.flush(key, reason)));
  }

  cancel(key: string) {
    const entry = this.pending.get(key);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    this.pending.delete(key);
  }

  hasPending(key?: string) {
    if (key) return this.pending.has(key);
    return this.pending.size > 0;
  }

  pendingKeys() {
    return [...this.pending.keys()];
  }
}

/** Pure helper for tests: coalesce patches by field. */
export function coalescePatches<T extends Record<string, unknown>>(
  patches: Array<Partial<T>>,
): Partial<T> {
  return patches.reduce<Partial<T>>((acc, patch) => ({ ...acc, ...patch }), {});
}
