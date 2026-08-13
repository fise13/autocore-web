import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isUntrustedEmptyQuerySnapshot,
  isUntrustedMissingDocumentSnapshot,
} from './untrusted-snapshot';

describe('isUntrustedEmptyQuerySnapshot', () => {
  it('ignores cache-only empty snapshots with no pending writes', () => {
    assert.equal(
      isUntrustedEmptyQuerySnapshot({
        empty: true,
        metadata: { fromCache: true, hasPendingWrites: false },
      }),
      true,
    );
  });

  it('applies a server-confirmed empty collection', () => {
    assert.equal(
      isUntrustedEmptyQuerySnapshot({
        empty: true,
        metadata: { fromCache: false, hasPendingWrites: false },
      }),
      false,
    );
  });

  it('applies cache snapshots that actually have documents', () => {
    assert.equal(
      isUntrustedEmptyQuerySnapshot({
        empty: false,
        metadata: { fromCache: true, hasPendingWrites: false },
      }),
      false,
    );
  });

  it('applies empty cache snapshots that still have local writes', () => {
    assert.equal(
      isUntrustedEmptyQuerySnapshot({
        empty: true,
        metadata: { fromCache: true, hasPendingWrites: true },
      }),
      false,
    );
  });
});

describe('isUntrustedMissingDocumentSnapshot', () => {
  it('ignores cache-only missing docs', () => {
    assert.equal(
      isUntrustedMissingDocumentSnapshot({
        exists: () => false,
        metadata: { fromCache: true, hasPendingWrites: false },
      }),
      true,
    );
  });

  it('applies a server-confirmed missing doc', () => {
    assert.equal(
      isUntrustedMissingDocumentSnapshot({
        exists: false,
        metadata: { fromCache: false, hasPendingWrites: false },
      }),
      false,
    );
  });

  it('applies a cached doc that exists', () => {
    assert.equal(
      isUntrustedMissingDocumentSnapshot({
        exists: () => true,
        metadata: { fromCache: true, hasPendingWrites: false },
      }),
      false,
    );
  });
});
