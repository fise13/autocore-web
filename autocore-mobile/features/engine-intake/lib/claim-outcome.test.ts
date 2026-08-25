import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canOpenSessionImmediately,
  canShowSessionForLocalClaim,
  resolveClaimOutcome,
} from './claim-outcome';

describe('resolveClaimOutcome', () => {
  it('queues a claim that failed because the phone is offline', () => {
    assert.deepEqual(resolveClaimOutcome(new Error('Network request failed')), {
      action: 'queued',
    });
  });

  it('queues the 409 family the server uses for transient claim state', () => {
    // EngineIntakeCommandError defaults to 409, so this is the common case
    // while a previous Finish is still waiting on its photos to upload.
    for (const message of [
      'Session claim is no longer active',
      'Engine intake session was not found',
      'This session is active on another device',
    ]) {
      assert.deepEqual(
        resolveClaimOutcome({ status: 409, message }),
        { action: 'queued' },
        message,
      );
    }
  });

  it('queues a server error and a rate limit', () => {
    assert.equal(resolveClaimOutcome({ status: 500, message: 'boom' }).action, 'queued');
    assert.equal(resolveClaimOutcome({ status: 429, message: 'slow down' }).action, 'queued');
  });

  it('queues an expired token so the worker can keep shooting', () => {
    // The photos are safe locally; re-auth plus the drain settles the claim.
    assert.equal(resolveClaimOutcome({ status: 401, message: 'Authorization required' }).action, 'queued');
  });

  it('blocks when another worker holds the bay', () => {
    const outcome = resolveClaimOutcome({ status: 409, message: 'Claimed by Petrov' });
    assert.equal(outcome.action, 'blocked');
    if (outcome.action !== 'blocked') return;
    assert.equal(outcome.reason, 'held-by-other');
  });

  it('blocks on a role that cannot open the engine', () => {
    const outcome = resolveClaimOutcome({
      status: 403,
      message: 'Your role cannot document engines',
    });
    assert.equal(outcome.action, 'blocked');
    if (outcome.action !== 'blocked') return;
    assert.equal(outcome.reason, 'not-permitted');
  });

  it('reads the server 403 for an assigned job as the bay being held', () => {
    // "Job is assigned to another worker" is literally somebody else holding
    // it; either way Continue must not open, but the toast should say who.
    const outcome = resolveClaimOutcome({
      status: 403,
      message: 'Job is assigned to another worker',
    });
    assert.equal(outcome.action, 'blocked');
    if (outcome.action !== 'blocked') return;
    assert.equal(outcome.reason, 'held-by-other');
  });

  it('blocks on a job state that cannot be captured into', () => {
    const outcome = resolveClaimOutcome({
      status: 409,
      message: 'Job cannot be claimed while completed',
    });
    assert.equal(outcome.action, 'blocked');
    if (outcome.action !== 'blocked') return;
    assert.equal(outcome.reason, 'unclaimable-state');
  });

  it('carries the server wording through so the toast is specific', () => {
    const outcome = resolveClaimOutcome({ status: 403, message: 'Job is assigned to another worker' });
    assert.equal(outcome.action, 'blocked');
    assert.equal(outcome.action, 'blocked');
    if (outcome.action !== 'blocked') return;
    assert.equal(outcome.message, 'Job is assigned to another worker');
  });
});

describe('canOpenSessionImmediately', () => {
  const base = {
    activeSessionId: 's1',
    claimedByUid: 'u1',
    claimDeviceId: 'd1',
    uid: 'u1',
    deviceId: 'd1',
  };

  it('opens when this device already holds the claim', () => {
    assert.equal(canOpenSessionImmediately(base), true);
  });

  it('does not open on another worker or another device', () => {
    assert.equal(canOpenSessionImmediately({ ...base, claimedByUid: 'u2' }), false);
    assert.equal(canOpenSessionImmediately({ ...base, claimDeviceId: 'd2' }), false);
  });

  it('does not open without an active session', () => {
    assert.equal(canOpenSessionImmediately({ ...base, activeSessionId: null }), false);
    assert.equal(canOpenSessionImmediately({ ...base, activeSessionId: '' }), false);
  });
});

describe('canShowSessionForLocalClaim', () => {
  it('shows the camera while the optimistic claim is the only record of it', () => {
    // The window between opening the camera and the claim reaching the server.
    assert.equal(
      canShowSessionForLocalClaim({
        sessionId: 's1',
        overlaySessionIds: ['s1'],
        hasPendingClaimCommand: false,
      }),
      true,
    );
  });

  it('still shows the camera for a claim queued after a failure', () => {
    assert.equal(
      canShowSessionForLocalClaim({
        sessionId: 's1',
        overlaySessionIds: [],
        hasPendingClaimCommand: true,
      }),
      true,
    );
  });

  it('gates a session this device has no local claim for', () => {
    assert.equal(
      canShowSessionForLocalClaim({
        sessionId: 's1',
        overlaySessionIds: ['s2'],
        hasPendingClaimCommand: false,
      }),
      false,
    );
  });
});
