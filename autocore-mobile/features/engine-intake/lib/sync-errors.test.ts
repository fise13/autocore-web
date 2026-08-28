import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifySyncError,
  describeSyncError,
  isAppLifecycleTransportError,
  isBenignCancelError,
  isBenignFieldCompleteError,
  isIdempotentPhotoSuccess,
  isRetryableSyncError,
  mayDeleteLocalFile,
  shouldRequeueAfterAppLeave,
  shouldReviveFailedSyncRow,
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
    assert.equal(
      classifySyncError({ message: 'The network connection was lost.' }),
      'NETWORK_UNAVAILABLE',
    );
    assert.equal(
      classifySyncError({ message: 'fetch failed: Сетевое соединение потеряно.' }),
      'NETWORK_UNAVAILABLE',
    );
    assert.equal(classifySyncError({ message: 'fetch failed' }), 'NETWORK_UNAVAILABLE');
    assert.equal(classifySyncError({ status: 0, message: 'HTTP 0' }), 'NETWORK_UNAVAILABLE');
  });

  it('treats an iOS upload cancel as retryable rather than a dead photo', () => {
    assert.equal(classifySyncError({ message: 'Upload was cancelled' }), 'TIMEOUT');
    assert.equal(isRetryableSyncError('TIMEOUT'), true);
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

  it('treats anything without an HTTP status as transport, whatever it says', () => {
    // The rule that makes this locale-proof. iOS phrases NSURL errors in the
    // phone's own language, so a substring list can only ever be behind; an
    // error that never got a status never reached a server, and that is a fact
    // about the request rather than about its wording.
    assert.equal(classifySyncError(new Error('something odd')), 'NETWORK_UNAVAILABLE');
    assert.equal(classifySyncError(null), 'NETWORK_UNAVAILABLE');
    assert.equal(classifySyncError(undefined), 'NETWORK_UNAVAILABLE');
  });

  it('reads the localized NSURL text a Russian handset actually produces', () => {
    // Verbatim from the yard screenshots that started this.
    assert.equal(
      classifySyncError({
        message: 'fetch failed: Сервер с указанным именем хоста не удалось найти.',
      }),
      'NETWORK_UNAVAILABLE',
    );
    assert.equal(
      classifySyncError({
        message: 'fetch failed: Вероятно, соединение с интернетом прервано.',
      }),
      'NETWORK_UNAVAILABLE',
    );
  });

  it('recognises NSURL numeric codes without any text at all', () => {
    for (const code of [-1001, -1003, -1004, -1005, -1009, -1200]) {
      assert.equal(classifySyncError({ code }), 'NETWORK_UNAVAILABLE', String(code));
    }
  });

  it('still trusts a real HTTP status when the response carried one', () => {
    assert.equal(classifySyncError({ status: 403 }), 'PERMISSION_DENIED');
    assert.equal(classifySyncError({ status: 401 }), 'AUTH_EXPIRED');
    // The Storage PUT raises its status in the message rather than a field.
    assert.equal(
      classifySyncError(new Error('Photo upload failed (HTTP 503)')),
      'SERVER_5XX',
    );
  });
});

describe('isAppLifecycleTransportError', () => {
  it('recognises iOS tearing down the JS request when the app leaves the foreground', () => {
    assert.equal(
      isAppLifecycleTransportError({ message: 'The network connection was lost.' }),
      true,
    );
    assert.equal(
      isAppLifecycleTransportError({ message: 'Software caused connection abort' }),
      true,
    );
    assert.equal(isAppLifecycleTransportError({ message: 'Upload was cancelled' }), true);
    assert.equal(isAppLifecycleTransportError({ message: 'cancelled' }), true);
    assert.equal(
      isAppLifecycleTransportError({ message: 'fetch failed: Сетевое соединение потеряно.' }),
      true,
    );
  });

  it('does not treat a real radio-down as a lifecycle abort', () => {
    assert.equal(isAppLifecycleTransportError(new TypeError('Network request failed')), false);
    assert.equal(
      isAppLifecycleTransportError({ message: 'The Internet connection appears to be offline.' }),
      false,
    );
  });

  it('does not treat a job that is already cancelled as a transport abort', () => {
    assert.equal(
      isAppLifecycleTransportError({ message: 'Job is already cancelled' }),
      false,
    );
  });
});

describe('shouldRequeueAfterAppLeave', () => {
  it('requeues a torn-down PUT when the app is no longer in the foreground', () => {
    assert.equal(
      shouldRequeueAfterAppLeave({
        appState: 'background',
        error: { message: 'The network connection was lost.' },
      }),
      true,
    );
    assert.equal(
      shouldRequeueAfterAppLeave({
        appState: 'background',
        error: { message: 'fetch failed: Сетевое соединение потеряно.' },
      }),
      true,
    );
  });

  it('does not requeue a real outage while the person is still in the app', () => {
    assert.equal(
      shouldRequeueAfterAppLeave({
        appState: 'active',
        error: new TypeError('Network request failed'),
      }),
      false,
    );
  });

  it('requeues a torn-down fetch even before AppState leaves active', () => {
    assert.equal(
      shouldRequeueAfterAppLeave({
        appState: 'active',
        error: { message: 'fetch failed: Сетевое соединение потеряно.' },
      }),
      true,
    );
  });
});

describe('shouldReviveFailedSyncRow', () => {
  it('revives a photo that was marked failed from a localized fetch abort', () => {
    assert.equal(
      shouldReviveFailedSyncRow({
        status: 'failed',
        errorInfo: { code: 'UNKNOWN', message: 'fetch failed: Сетевое соединение потеряно.' },
        lastError: 'fetch failed: Сетевое соединение потеряно.',
      }),
      true,
    );
    assert.equal(
      shouldReviveFailedSyncRow({
        status: 'failed',
        errorInfo: { code: 'NETWORK_UNAVAILABLE' },
        lastError: 'Saved on this iPhone. Will sync automatically when you are online.',
      }),
      true,
    );
  });

  it('leaves a real dead-file or auth failure alone', () => {
    assert.equal(
      shouldReviveFailedSyncRow({
        status: 'failed',
        errorInfo: { code: 'FILE_MISSING', message: 'That photo file is gone from this iPhone.' },
      }),
      false,
    );
    assert.equal(
      shouldReviveFailedSyncRow({
        status: 'failed',
        errorInfo: { code: 'PERMISSION_DENIED', message: 'Your role cannot add engine photos.' },
      }),
      false,
    );
    // Anything the person cannot fix stays parked; everything else gets one
    // more attempt per launch, so a row killed by a server bug recovers as soon
    // as the fix ships rather than staying dead on that phone forever.
    assert.equal(
      shouldReviveFailedSyncRow({
        status: 'failed',
        errorInfo: { code: 'UNKNOWN', message: 'something odd' },
        lastError: 'something odd',
      }),
      true,
    );
    assert.equal(
      shouldReviveFailedSyncRow({
        status: 'queued',
        lastError: 'fetch failed: Сетевое соединение потеряно.',
      }),
      false,
    );
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
        /Saved on this phone/,
        `${code} does not say the photo is safe`,
      );
    }
  });

  it('never uses the word sync in anything a person can read', () => {
    // The yard has no model of a queue and no way to act on one. Every sentence
    // here is either "the photo is safe" or "here is what you can do".
    for (const code of SYNC_ERROR_CODES) {
      assert.ok(!/sync/i.test(syncErrorMessage(code)), `${code}: ${syncErrorMessage(code)}`);
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

  it('keeps a server body out of the camera, but not out of diagnostics', () => {
    // "Invalid intake photo finalization" is a zod label from an API route. A
    // worker read it on a camera screen, in a language they do not speak, about
    // a photo that was already safely on the server.
    const info = describeSyncError({
      status: 400,
      message: 'Invalid intake photo finalization',
    });
    assert.equal(info.code, 'INVALID_REQUEST');
    assert.equal(info.message, 'The server would not take this photo. Support can see why.');
    assert.equal(info.raw, 'Invalid intake photo finalization');
    assert.equal(info.retryable, false);
  });

  it('surfaces a resume precondition as retryable without naming the machinery', () => {
    const info = describeSyncError({
      status: 409,
      message: 'Resume the session before taking photos',
    });
    assert.equal(info.code, 'PRECONDITION');
    assert.equal(info.retryable, true);
    assert.equal(info.message, 'Saved on this phone. It uploads by itself in a moment.');
    assert.equal(info.raw, 'Resume the session before taking photos');
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
