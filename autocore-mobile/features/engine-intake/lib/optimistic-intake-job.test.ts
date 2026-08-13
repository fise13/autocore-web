import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyOptimisticClaim,
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
});
