/**
 * Parallel photo uploads for the intake outbox.
 *
 * The drain used to await one prepare→PUT→finalize chain at a time. On a
 * typical bay walk (6–12 shots) that left Wi‑Fi idle between files. A small
 * pool keeps the pipe full without flooding Storage / the API.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

/** Concurrent photo uploads per drain wave — enough to fill the pipe, not the radio. */
export const PHOTO_UPLOAD_CONCURRENCY = 4;

/**
 * Run `worker` over `items` with at most `concurrency` in flight.
 * Preserves completion ordering only insofar as each worker awaits its own item.
 */
export async function mapPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const runners = Array.from({ length: limit }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      await worker(items[index]!, index);
    }
  });

  await Promise.all(runners);
}

/**
 * A counting gate shared by everything that talks to the photo backend.
 *
 * `mapPool` bounds one drain wave. It cannot bound a wave *and* the uploads
 * that start the moment a shutter fires, and those now overlap: a photo is
 * primed as soon as it is captured rather than waiting for the next wave. Two
 * independently-bounded producers would have put eight transfers on the radio.
 */
export function createSlotGate(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  const size = Math.max(1, limit);
  const waiting: Array<() => void> = [];
  let active = 0;

  const acquire = async (): Promise<void> => {
    if (active < size) {
      active += 1;
      return;
    }
    // The releaser hands its slot straight over rather than giving it back, so
    // a woken waiter cannot lose the race to a caller arriving at that moment.
    await new Promise<void>((resolve) => waiting.push(resolve));
  };

  const release = (): void => {
    const next = waiting.shift();
    if (next) {
      next();
      return;
    }
    active -= 1;
  };

  return async function withSlot<T>(task: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
}

/** Global ceiling on photo transfers in flight, whatever started them. */
export const withPhotoUploadSlot = createSlotGate(PHOTO_UPLOAD_CONCURRENCY);
