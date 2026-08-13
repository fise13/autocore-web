import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifySyncError,
  describeSyncError,
  isBenignCancelError,
  isBenignFieldCompleteError,
  isIdempotentPhotoSuccess,
  isRetryableSyncError,
  mayDeleteLocalFile,
  syncErrorMessage,
  SYNC_ERROR_CODES,
} from './sync-errors';

describe('classifySyncError', () => {
  it('reads offline off the message, because fetch has no status for it', () => {
    assert.equal(classifySyncError(new TypeError('Network request failed')), 'NETWORK_UNAVAILABLE');
    assert.equal(
      classifySyncError({ message: 'The Internet connection appears to be offline.' }),
      'NETWORK_UNAVAILABLE',
    );
    assert.equal(classifySyncError({ message: 'Failed to fetch' }), 'NETWORK_UNAVAILABLE');
  });

  it('maps HTTP statuses to codes', () => {
    assert.equal(classifySyncError({ status: 401 }), 'AUTH_EXPIRED');
    assert.equal(classifySyncError({ status: 403 }), 'PERMISSION_DENIED');
    assert.equal(classifySyncError({ status: 404 }), 'NOT_FOUND');
    assert.equal(classifySyncError({ status: 408 }), 'TIMEOUT');
    assert.equal(classifySyncError({ status: 409 }), 'CONFLICT');
    assert.equal(classifySyncError({ status: 410 }), 'FILE_MISSING');
    assert.equal(classifySyncError({ status: 413 }), 'FILE_TOO_LARGE');
    assert.equal(classifySyncError({ status: 429 }), 'RATE_LIMIT');
    assert.equal(classifySyncError({ status: 500 }), 'SERVER_5XX');
    assert.equal(classifySyncError({ status: 503 }), 'SERVER_5XX');
    assert.equal(classifySyncError({ status: 422 }), 'INVALID_REQUEST');
  });

  it('recognises a missing deploy rather than calling it a server error', () => {
    assert.equal(
      classifySyncError({ status: 502, message: 'API returned HTML instead of JSON' }),
      'DEPLOY_REQUIRED',
    );
  });

  it('recognises a lost local file', () => {
    assert.equal(
      classifySyncError({ status: 410, message: 'Local photo is missing. Retake this angle.' }),
      'FILE_MISSING',
    );
  });

  it('treats an empty capture as a missing file, not a server rejection', () => {
    assert.equal(
      classifySyncError({ status: 400, message: 'Captured photo is empty. Retake this angle.' }),
      'FILE_MISSING',
    );
  });

  it('treats session-paused / Finish-before-photos as a retryable precondition', () => {
    assert.equal(
      classifySyncError({ status: 409, message: 'Resume the session before taking photos' }),
      'PRECONDITION',
    );
    assert.equal(
      classifySyncError({
        status: 409,
        message: 'Finish needs a serial number and at least one photo',
      }),
      'PRECONDITION',
    );
    assert.equal(isRetryableSyncError('PRECONDITION'), true);
  });

  it('falls back to UNKNOWN rather than guessing', () => {
    assert.equal(classifySyncError(new Error('something odd')), 'UNKNOWN');
    assert.equal(classifySyncError(null), 'UNKNOWN');
    assert.equal(classifySyncError(undefined), 'UNKNOWN');
  });
});

describe('isIdempotentPhotoSuccess', () => {
  it('treats an explicit already-recorded 409 as success', () => {
    assert.equal(
      isIdempotentPhotoSuccess({
        status: 409,
        message: 'This photo was already recorded on the server.',
      }),
      true,
    );
    assert.equal(
      isIdempotentPhotoSuccess({
        status: 409,
        message: 'This photo is already on the server.',
      }),
      true,
    );
  });

  it('does not treat a bare or mismatch 409 as already uploaded', () => {
    assert.equal(isIdempotentPhotoSuccess({ status: 409 }), false);
    assert.equal(
      isIdempotentPhotoSuccess({
        status: 409,
        message: 'Prepared photo upload changed before finalization',
      }),
      false,
    );
    assert.equal(
      isIdempotentPhotoSuccess({
        status: 409,
        message: 'This session is active on another device',
      }),
      false,
    );
  });

  it('does not treat a paused-session 409 as already uploaded', () => {
    assert.equal(
      isIdempotentPhotoSuccess({ status: 409, message: 'Resume the session before taking photos' }),
      false,
    );
  });

  it('does not swallow real upload failures', () => {
    assert.equal(isIdempotentPhotoSuccess({ status: 500 }), false);
    assert.equal(isIdempotentPhotoSuccess({ status: 401 }), false);
    assert.equal(isIdempotentPhotoSuccess(new TypeError('Network request failed')), false);
  });
});

describe('isRetryableSyncError', () => {
  it('retries only what another attempt could fix', () => {
    assert.equal(isRetryableSyncError('NETWORK_UNAVAILABLE'), true);
    assert.equal(isRetryableSyncError('TIMEOUT'), true);
    assert.equal(isRetryableSyncError('SERVER_5XX'), true);
    assert.equal(isRetryableSyncError('RATE_LIMIT'), true);
    assert.equal(isRetryableSyncError('CONFLICT'), true);
    assert.equal(isRetryableSyncError('PRECONDITION'), true);
  });

  it('does not retry what a person or a deploy has to fix', () => {
    assert.equal(isRetryableSyncError('AUTH_EXPIRED'), false);
    assert.equal(isRetryableSyncError('PERMISSION_DENIED'), false);
    assert.equal(isRetryableSyncError('INVALID_REQUEST'), false);
    assert.equal(isRetryableSyncError('NOT_FOUND'), false);
    assert.equal(isRetryableSyncError('FILE_TOO_LARGE'), false);
    assert.equal(isRetryableSyncError('FILE_MISSING'), false);
    assert.equal(isRetryableSyncError('DEPLOY_REQUIRED'), false);
  });
});

describe('syncErrorMessage', () => {
  it('has copy for every code', () => {
    for (const code of SYNC_ERROR_CODES) {
      const message = syncErrorMessage(code);
      assert.ok(message.length > 0, `${code} has no message`);
      assert.ok(!/stack|undefined|\[object/i.test(message), `${code} leaks internals`);
    }
  });

  it('reassures the person that retryable failures did not lose the photo', () => {
    for (const code of SYNC_ERROR_CODES) {
      if (!isRetryableSyncError(code)) continue;
      if (code === 'CONFLICT') {
        assert.match(syncErrorMessage(code), /already on the server/i);
        continue;
      }
      assert.match(
        syncErrorMessage(code),
        /safe on this iPhone|Saved on this iPhone/,
        `${code} does not say the photo is safe`,
      );
    }
  });

  it('never calls a plain offline stretch a failure', () => {
    assert.doesNotMatch(syncErrorMessage('NETWORK_UNAVAILABLE'), /fail|error/i);
  });
});

describe('describeSyncError', () => {
  it('carries the code, the status and a timestamp for diagnostics', () => {
    const now = new Date('2026-08-12T20:14:00.000Z');
    const info = describeSyncError({ status: 503, message: 'Service Unavailable' }, now);
    assert.equal(info.code, 'SERVER_5XX');
    assert.equal(info.status, 503);
    assert.equal(info.retryable, true);
    assert.equal(info.timestamp, '2026-08-12T20:14:00.000Z');
  });

  it('omits status when the failure had none', () => {
    const info = describeSyncError(new TypeError('Network request failed'));
    assert.equal(info.status, undefined);
    assert.equal(info.code, 'NETWORK_UNAVAILABLE');
  });

  it('keeps the real 400 body instead of the canned support line', () => {
    const info = describeSyncError({ status: 400, message: 'Invalid intake photo' });
    assert.equal(info.code, 'INVALID_REQUEST');
    assert.equal(info.message, 'Invalid intake photo');
    assert.equal(info.retryable, false);
  });

  it('surfaces a resume precondition as retryable with the server reason', () => {
    const info = describeSyncError({
      status: 409,
      message: 'Resume the session before taking photos',
    });
    assert.equal(info.code, 'PRECONDITION');
    assert.equal(info.retryable, true);
    assert.equal(info.message, 'Resume the session before taking photos');
  });
});

describe('mayDeleteLocalFile', () => {
  it('only clears a photo after confirmed success, or when it is already gone', () => {
    assert.equal(mayDeleteLocalFile('uploaded'), true);
    assert.equal(mayDeleteLocalFile('file-missing'), true);
  });
});

describe('isBenignCancelError', () => {
  it('treats a missing job as already cancelled', () => {
    assert.equal(isBenignCancelError({ status: 404, message: 'Engine intake job was not found' }), true);
    assert.equal(isBenignCancelError({ status: 409, message: 'already cancelled' }), true);
    assert.equal(isBenignCancelError({ status: 403, message: 'Insufficient engine intake permissions' }), false);
  });
});

describe('isBenignFieldCompleteError', () => {
  it('treats Finish on an already-Ready engine as done', () => {
    assert.equal(
      isBenignFieldCompleteError({
        message: 'Engine intake job cannot transition from awaiting_verification to awaiting_verification',
      }),
      true,
    );
    assert.equal(
      isBenignFieldCompleteError({
        status: 409,
        message: 'Finish needs a serial number and at least one photo',
      }),
      false,
    );
  });
});
