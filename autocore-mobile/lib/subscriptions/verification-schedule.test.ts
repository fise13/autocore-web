import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isVerificationDue,
  MAX_VERIFICATION_ATTEMPTS,
  verificationBackoffMs,
} from './verification-schedule';

const MINUTE = 60_000;
const NOW = 1_770_000_000_000;

describe('verificationBackoffMs', () => {
  it('leaves room for the first in-flight attempt before retrying', () => {
    // A purchase is tracked before its first verify is sent, so index 0 must
    // not be zero or the drain would race that request.
    assert.ok(verificationBackoffMs(0) > 0);
    assert.equal(verificationBackoffMs(0), 30_000);
  });

  it('grows with each attempt', () => {
    assert.ok(verificationBackoffMs(2) > verificationBackoffMs(1));
    assert.ok(verificationBackoffMs(6) > verificationBackoffMs(4));
  });

  it('never goes backwards', () => {
    for (let attempts = 1; attempts < 12; attempts += 1) {
      assert.ok(
        verificationBackoffMs(attempts) >= verificationBackoffMs(attempts - 1),
        `backoff shrank at attempt ${attempts}`,
      );
    }
  });

  it('flattens at twelve hours instead of running off the end of the table', () => {
    assert.equal(verificationBackoffMs(99), 720 * MINUTE);
  });
});

describe('isVerificationDue', () => {
  it('a purchase with no recorded attempt is due at once', () => {
    assert.equal(isVerificationDue({ attempts: 0, lastAttemptAt: null }, NOW), true);
  });

  it('does not race the first verification while it is still in flight', () => {
    assert.equal(isVerificationDue({ attempts: 0, lastAttemptAt: NOW - 5_000 }, NOW), false);
    assert.equal(isVerificationDue({ attempts: 0, lastAttemptAt: NOW - 45_000 }, NOW), true);
  });

  it('holds an entry inside its backoff window', () => {
    // Two failures → five-minute wait; only one has passed.
    assert.equal(
      isVerificationDue({ attempts: 3, lastAttemptAt: NOW - 1 * MINUTE }, NOW),
      false,
    );
  });

  it('releases the entry once the window elapses', () => {
    assert.equal(
      isVerificationDue({ attempts: 3, lastAttemptAt: NOW - 6 * MINUTE }, NOW),
      true,
    );
  });

  it('stops retrying a transaction the server has refused forty times', () => {
    assert.equal(
      isVerificationDue(
        { attempts: MAX_VERIFICATION_ATTEMPTS, lastAttemptAt: NOW - 10 * 24 * 60 * MINUTE },
        NOW,
      ),
      false,
    );
  });
});
