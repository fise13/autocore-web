/**
 * Parallel photo uploads for the intake outbox.
 *
 * The drain used to await one prepare→PUT→finalize chain at a time. On a
 * typical bay walk (6–12 shots) that left Wi‑Fi idle between files. A small
 * pool keeps the pipe full without flooding Storage / the API.
 *
 * Pure — no React Native — so the node test runner can load it.
 */

/** Concurrent photo uploads per drain wave. */
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
