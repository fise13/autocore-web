import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapPool, PHOTO_UPLOAD_CONCURRENCY } from './intake-upload-pool';

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
    assert.ok(PHOTO_UPLOAD_CONCURRENCY <= 6);
  });
});
