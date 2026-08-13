import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isClaimGoneError,
  isClaimGoneMessage,
  isClaimHeldByOtherMessage,
  rebindJobSessionIds,
} from './intake-session-recover';

describe('isClaimGoneMessage', () => {
  it('recognises a dead bay claim', () => {
    assert.equal(isClaimGoneMessage('Session claim is no longer active'), true);
    assert.equal(isClaimGoneMessage('Resume the session before taking photos'), true);
    assert.equal(isClaimGoneMessage('Finish needs a serial number'), false);
  });
});

describe('isClaimGoneError', () => {
  it('reads the Error message', () => {
    assert.equal(
      isClaimGoneError(new Error('Session claim is no longer active')),
      true,
    );
  });
});

describe('isClaimHeldByOtherMessage', () => {
  it('detects another worker holding the bay', () => {
    assert.equal(isClaimHeldByOtherMessage('Job is claimed by Alex'), true);
    assert.equal(isClaimHeldByOtherMessage('Session claim is no longer active'), false);
  });
});

describe('rebindJobSessionIds', () => {
  it('rewrites photos and session-scoped commands for one job', () => {
    const result = rebindJobSessionIds({
      companyId: 'co',
      jobId: 'job_1',
      sessionId: 'session_new',
      photos: [
        { id: 'p1', companyId: 'co', jobId: 'job_1', sessionId: 'session_old' },
        { id: 'p2', companyId: 'co', jobId: 'job_2', sessionId: 'session_other' },
      ],
      commands: [
        {
          id: 'c1',
          companyId: 'co',
          command: {
            type: 'field_complete',
            payload: { jobId: 'job_1', sessionId: 'session_old' },
          },
        },
        {
          id: 'c2',
          companyId: 'co',
          command: {
            type: 'pause_session',
            payload: { jobId: 'job_1', sessionId: 'session_old' },
          },
        },
      ],
    });
    assert.equal(result.rebound, 3);
    assert.equal(result.photos[0]?.sessionId, 'session_new');
    assert.equal(result.photos[1]?.sessionId, 'session_other');
    assert.equal(result.commands[0]?.command.payload.sessionId, 'session_new');
    assert.equal(result.commands[1]?.command.payload.sessionId, 'session_new');
  });

  it('is a no-op when already bound', () => {
    const result = rebindJobSessionIds({
      companyId: 'co',
      jobId: 'job_1',
      sessionId: 'session_1',
      photos: [{ id: 'p1', companyId: 'co', jobId: 'job_1', sessionId: 'session_1' }],
      commands: [],
    });
    assert.equal(result.rebound, 0);
  });
});
