import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyOptimisticClaim,
  applyOptimisticFieldComplete,
  applyReadyJobOverrides,
  buildOptimisticIntakeJob,
  mergeIntakeJobs,
} from './optimistic-intake-job';

describe('buildOptimisticIntakeJob', () => {
  it('claims the local job so the camera can open before the server answers', () => {
    const job = buildOptimisticIntakeJob({
      companyId: 'acme',
      jobId: 'job_1',
      sessionId: 'session_1',
      uid: 'user_1',
      displayName: 'Alex',
      deviceId: 'device_1',
      identity: { serialCode: 'UF1', brandName: 'Cummins', engineCode: 'ISX' },
      now: '2026-08-13T00:00:00.000Z',
    });

    assert.equal(job.state, 'in_session');
    assert.equal(job.assignment.activeSessionId, 'session_1');
    assert.equal(job.assignment.claimedByUid, 'user_1');
    assert.equal(job.expectedIdentity.serialCode, 'UF1');
  });
});

describe('mergeIntakeJobs', () => {
  it('keeps local drafts that the server has not confirmed yet', () => {
    const local = buildOptimisticIntakeJob({
      companyId: 'acme',
      jobId: 'job_local',
      sessionId: 'session_1',
      uid: 'user_1',
      displayName: null,
      deviceId: 'device_1',
      identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
    });
    const server = [
      buildOptimisticIntakeJob({
        companyId: 'acme',
        jobId: 'job_server',
        sessionId: 'session_2',
        uid: 'user_1',
        displayName: null,
        deviceId: 'device_1',
        identity: { serialCode: 'UF2', brandName: '', engineCode: '' },
      }),
    ];
    const merged = mergeIntakeJobs(server, [local]);
    assert.equal(merged.some((job) => job.id === 'job_local'), true);
    assert.equal(merged.some((job) => job.id === 'job_server'), true);
  });

  it('drops the overlay once the server has the same job id', () => {
    const job = buildOptimisticIntakeJob({
      companyId: 'acme',
      jobId: 'job_1',
      sessionId: 'session_1',
      uid: 'user_1',
      displayName: null,
      deviceId: 'device_1',
      identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
    });
    const merged = mergeIntakeJobs([job], [applyOptimisticClaim(job, {
      sessionId: 'session_old',
      uid: 'user_1',
      displayName: null,
      deviceId: 'device_1',
    })]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.assignment.activeSessionId, 'session_1');
  });

  it('keeps a local claim when the server snapshot still has none', () => {
    const server = applyOptimisticFieldComplete(
      buildOptimisticIntakeJob({
        companyId: 'acme',
        jobId: 'job_1',
        sessionId: 'session_1',
        uid: 'user_1',
        displayName: null,
        deviceId: 'device_1',
        identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
      }),
    );
    const overlay = applyOptimisticClaim(server, {
      sessionId: 'session_2',
      uid: 'user_1',
      displayName: null,
      deviceId: 'device_1',
    });
    const [merged] = mergeIntakeJobs([server], [overlay]);
    assert.equal(merged?.state, 'in_session');
    assert.equal(merged?.assignment.activeSessionId, 'session_2');
  });

  it('hides engines the worker just cancelled, even if the server snapshot is stale', () => {
    const job = buildOptimisticIntakeJob({
      companyId: 'acme',
      jobId: 'job_1',
      sessionId: 'session_1',
      uid: 'user_1',
      displayName: null,
      deviceId: 'device_1',
      identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
    });
    const merged = mergeIntakeJobs([job], [], ['job_1']);
    assert.equal(merged.some((item) => item.id === 'job_1'), false);
  });

  it('hides engines just released to Motors Grid while Firestore still shows Ready', () => {
    const job = applyOptimisticFieldComplete(
      buildOptimisticIntakeJob({
        companyId: 'acme',
        jobId: 'job_1',
        sessionId: 'session_1',
        uid: 'user_1',
        displayName: null,
        deviceId: 'device_1',
        identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
      }),
    );
    const merged = mergeIntakeJobs([job], [], [], ['job_1']);
    assert.equal(merged.some((item) => item.id === 'job_1'), false);
  });
});

describe('applyOptimisticClaim', () => {
  it('reopens a Ready engine into a live session so more photos can be added', () => {
    const ready = applyOptimisticFieldComplete(
      buildOptimisticIntakeJob({
        companyId: 'acme',
        jobId: 'job_1',
        sessionId: 'session_1',
        uid: 'user_1',
        displayName: 'Alex',
        deviceId: 'device_1',
        identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
      }),
    );
    const claimed = applyOptimisticClaim(ready, {
      sessionId: 'session_2',
      uid: 'user_1',
      displayName: 'Alex',
      deviceId: 'device_1',
    });
    assert.equal(ready.state, 'awaiting_verification');
    assert.equal(claimed.state, 'in_session');
    assert.equal(claimed.assignment.activeSessionId, 'session_2');
  });
});

describe('applyReadyJobOverrides', () => {
  it('moves a stale in_session job to Ready when Finish already landed', () => {
    const job = buildOptimisticIntakeJob({
      companyId: 'acme',
      jobId: 'job_1',
      sessionId: 'session_1',
      uid: 'user_1',
      displayName: 'Alex',
      deviceId: 'device_1',
      identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
      now: '2026-08-13T00:00:00.000Z',
    });
    const [ready] = applyReadyJobOverrides([job], ['job_1'], '2026-08-13T01:00:00.000Z');
    assert.equal(ready?.state, 'awaiting_verification');
    assert.equal(ready?.assignment.activeSessionId, null);
    assert.equal(ready?.assignment.claimedByUid, null);
    assert.equal(ready?.fieldCompletedAt, '2026-08-13T01:00:00.000Z');
  });

  it('leaves jobs the server already parked in review alone', () => {
    const job = applyOptimisticFieldComplete(
      buildOptimisticIntakeJob({
        companyId: 'acme',
        jobId: 'job_1',
        sessionId: 'session_1',
        uid: 'user_1',
        displayName: null,
        deviceId: 'device_1',
        identity: { serialCode: 'UF1', brandName: '', engineCode: '' },
      }),
      '2026-08-13T00:00:00.000Z',
    );
    const [ready] = applyReadyJobOverrides([job], ['job_1'], '2026-08-13T02:00:00.000Z');
    assert.equal(ready?.fieldCompletedAt, '2026-08-13T00:00:00.000Z');
  });
});
