import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isPreparedUploadUsable,
  PREPARED_UPLOAD_SAFETY_MS,
  PREPARED_UPLOAD_TTL_MS,
  preparedUploadExpiresAt,
  withPreparedUploadDefaults,
} from './prepared-upload';

const NOW = new Date('2026-08-27T10:00:00.000Z');

function credentials(overrides?: { uploadUrl?: string; expiresAt?: string }) {
  return {
    uploadUrl: overrides?.uploadUrl ?? 'https://storage.googleapis.com/signed',
    expiresAt: overrides?.expiresAt ?? preparedUploadExpiresAt(NOW),
  };
}

describe('preparedUploadExpiresAt', () => {
  it('matches the lifetime the server signs an upload URL for', () => {
    assert.equal(
      Date.parse(preparedUploadExpiresAt(NOW)) - NOW.getTime(),
      PREPARED_UPLOAD_TTL_MS,
    );
  });
});

describe('isPreparedUploadUsable', () => {
  it('reuses fresh credentials so a leave spends its window on the PUT', () => {
    assert.equal(isPreparedUploadUsable(credentials(), NOW), true);
  });

  it('refuses credentials that expire inside the safety margin', () => {
    const almostGone = new Date(
      NOW.getTime() + PREPARED_UPLOAD_SAFETY_MS - 1_000,
    ).toISOString();
    assert.equal(
      isPreparedUploadUsable(credentials({ expiresAt: almostGone }), NOW),
      false,
    );
  });

  it('refuses an expired URL', () => {
    const past = new Date(NOW.getTime() - 1).toISOString();
    assert.equal(isPreparedUploadUsable(credentials({ expiresAt: past }), NOW), false);
  });

  it('refuses the empty upload URL prepare returns for an already-uploaded photo', () => {
    assert.equal(isPreparedUploadUsable(credentials({ uploadUrl: '' }), NOW), false);
  });

  it('treats a missing or unparsable row as never prepared', () => {
    assert.equal(isPreparedUploadUsable(null, NOW), false);
    assert.equal(
      isPreparedUploadUsable(credentials({ expiresAt: 'not a date' }), NOW),
      false,
    );
  });
});

describe('withPreparedUploadDefaults', () => {
  it('gives a row written before these fields the ordinary prepare path', () => {
    const migrated = withPreparedUploadDefaults({ id: 'photo_1' });
    assert.equal(migrated.prepared, null);
    assert.equal(migrated.putStartedAt, null);
    assert.equal(migrated.id, 'photo_1');
  });

  it('leaves an already-migrated row alone', () => {
    const prepared = {
      serverPhotoId: 'srv',
      uploadUrl: 'https://signed',
      storagePath: 'companies/c/engine-intake/j/p.jpg',
      downloadToken: 'tok',
      contentType: 'image/jpeg',
      sizeBytes: 12,
      url: 'https://download',
      expiresAt: preparedUploadExpiresAt(NOW),
    };
    const migrated = withPreparedUploadDefaults({
      prepared,
      putStartedAt: '2026-08-27T09:59:00.000Z',
    });
    assert.equal(migrated.prepared, prepared);
    assert.equal(migrated.putStartedAt, '2026-08-27T09:59:00.000Z');
  });
});
