import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { likelyExceedsPersistLimit } from './persist-size';

describe('likelyExceedsPersistLimit', () => {
  const row = { serialCode: 'B123456', brandName: 'Subaru', engineCode: 'EJ251', notes: 'x'.repeat(300) };

  it('flags a catalog whose full JSON would be over the limit', () => {
    const big = Array.from({ length: 10_000 }, () => row);
    assert.equal(likelyExceedsPersistLimit(big, 750_000), true);
    assert.ok(JSON.stringify(big).length > 750_000);
  });

  it('lets smaller catalogs and non-arrays through to be persisted', () => {
    assert.equal(likelyExceedsPersistLimit(Array.from({ length: 1_000 }, () => row), 750_000), false);
    assert.equal(likelyExceedsPersistLimit({ huge: 'x'.repeat(1_000_000) }, 750_000), false);
    assert.equal(likelyExceedsPersistLimit([row], 10), false);
  });
});
