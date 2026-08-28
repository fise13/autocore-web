import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSlotGate, mapPool, PHOTO_UPLOAD_CONCURRENCY } from './intake-upload-pool';

describe('mapPool', () => {
  it('runs every item', async () => {
    const seen: number[] = [];
    await mapPool([1, 2, 3, 4, 5], 2, async (value) => {
      seen.push(value);
    });
    assert.deepEqual(seen.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
  });

  it('caps in-flight work at concurrency', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapPool([1, 2, 3, 4, 5, 6], 3, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    });
    assert.ok(peak <= 3);
    assert.ok(peak >= 2);
  });

  it('exports a practical default concurrency', () => {
    assert.ok(PHOTO_UPLOAD_CONCURRENCY >= 3);
    assert.ok(PHOTO_UPLOAD_CONCURRENCY <= 4);
  });
});

describe('createSlotGate', () => {
  it('bounds callers that arrived from unrelated places', async () => {
    // The case that matters: a drain wave and the eager primes fired by the
    // shutter are separate producers, and only a shared gate can stop the two
    // of them putting eight transfers on the radio.
    const withSlot = createSlotGate(2);
    let inFlight = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 6 }, () =>
        withSlot(async () => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 5));
          inFlight -= 1;
        }),
      ),
    );
    assert.equal(peak, 2);
    assert.equal(inFlight, 0);
  });

  it('returns the task result', async () => {
    const withSlot = createSlotGate(1);
    assert.equal(await withSlot(async () => 'done'), 'done');
  });

  it('releases the slot when a task throws', async () => {
    const withSlot = createSlotGate(1);
    await assert.rejects(
      withSlot(async () => {
        throw new Error('upload failed');
      }),
      /upload failed/,
    );
    assert.equal(await withSlot(async () => 'still open'), 'still open');
  });

  it('never runs nothing — a zero limit is still one slot', async () => {
    const withSlot = createSlotGate(0);
    assert.equal(await withSlot(async () => 'ran'), 'ran');
  });
});
