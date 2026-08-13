import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAYS_MS,
  isJobRunnable,
  nextRetryAt,
  nextWakeUpAt,
  reconcileOnLaunch,
  resolveFailureTransition,
  retryDelayMs,
} from './sync-schedule';

const NOW = new Date('2026-08-12T20:00:00.000Z');

describe('retryDelayMs', () => {
  it('backs off along the schedule', () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6, 7].map(retryDelayMs),
      [...RETRY_DELAYS_MS],
    );
  });

  it('holds at the ceiling instead of growing forever', () => {
    assert.equal(retryDelayMs(8), 600_000);
    assert.equal(retryDelayMs(50), 600_000);
  });

  it('treats a zeroth attempt as the first', () => {
    assert.equal(retryDelayMs(0), 5_000);
  });
});

describe('nextRetryAt', () => {
  it('offsets from the given clock', () => {
    assert.equal(nextRetryAt(1, NOW), '2026-08-12T20:00:05.000Z');
    assert.equal(nextRetryAt(4, NOW), '2026-08-12T20:01:00.000Z');
  });
});

describe('isJobRunnable', () => {
  it('never runs anything while offline', () => {
    for (const status of ['queued', 'waiting_for_network', 'retry_scheduled', 'uploading'] as const) {
      assert.equal(
        isJobRunnable({ status, attemptCount: 0 }, { online: false, now: NOW }),
        false,
        status,
      );
    }
  });

  it('runs queued and network-parked jobs once online', () => {
    assert.equal(isJobRunnable({ status: 'queued', attemptCount: 0 }, { online: true, now: NOW }), true);
    assert.equal(
      isJobRunnable({ status: 'waiting_for_network', attemptCount: 3 }, { online: true, now: NOW }),
      true,
    );
  });

  it('picks up a job left mid-flight by a killed process', () => {
    assert.equal(
      isJobRunnable({ status: 'uploading', attemptCount: 1 }, { online: true, now: NOW }),
      true,
    );
  });

  it('waits for a scheduled retry to come due', () => {
    const job = {
      status: 'retry_scheduled' as const,
      attemptCount: 1,
      nextRetryAt: '2026-08-12T20:00:05.000Z',
    };
    assert.equal(isJobRunnable(job, { online: true, now: NOW }), false);
    assert.equal(
      isJobRunnable(job, { online: true, now: new Date('2026-08-12T20:00:05.000Z') }),
      true,
    );
  });

  it('runs a scheduled retry with an unreadable timestamp rather than stranding it', () => {
    assert.equal(
      isJobRunnable(
        { status: 'retry_scheduled', attemptCount: 1, nextRetryAt: 'nonsense' },
        { online: true, now: NOW },
      ),
      true,
    );
  });

  it('leaves terminal jobs alone', () => {
    assert.equal(isJobRunnable({ status: 'failed', attemptCount: 9 }, { online: true }), false);
    assert.equal(isJobRunnable({ status: 'completed', attemptCount: 1 }, { online: true }), false);
  });
});

describe('resolveFailureTransition', () => {
  it('parks offline work without burning an attempt', () => {
    const next = resolveFailureTransition({
      attemptCount: 3,
      retryable: true,
      offline: true,
      now: NOW,
    });
    assert.equal(next.status, 'waiting_for_network');
    assert.equal(next.attemptCount, 2, 'the offline attempt was rolled back');
    assert.equal(next.nextRetryAt, null);
  });

  it('never drives the attempt count negative', () => {
    const next = resolveFailureTransition({
      attemptCount: 0,
      retryable: true,
      offline: true,
      now: NOW,
    });
    assert.equal(next.attemptCount, 0);
  });

  it('schedules a backed-off retry for a retryable server failure', () => {
    const next = resolveFailureTransition({
      attemptCount: 2,
      retryable: true,
      offline: false,
      now: NOW,
    });
    assert.equal(next.status, 'retry_scheduled');
    assert.equal(next.nextRetryAt, '2026-08-12T20:00:15.000Z');
  });

  it('fails fast on something a retry cannot fix', () => {
    const next = resolveFailureTransition({
      attemptCount: 1,
      retryable: false,
      offline: false,
      now: NOW,
    });
    assert.equal(next.status, 'failed');
    assert.equal(next.nextRetryAt, null);
  });

  it('stops rescheduling at the attempt ceiling', () => {
    const next = resolveFailureTransition({
      attemptCount: MAX_RETRY_ATTEMPTS,
      retryable: true,
      offline: false,
      now: NOW,
    });
    assert.equal(next.status, 'failed');
  });

  it('offline outranks the ceiling — a tunnel must not exhaust the budget', () => {
    const next = resolveFailureTransition({
      attemptCount: MAX_RETRY_ATTEMPTS,
      retryable: true,
      offline: true,
      now: NOW,
    });
    assert.equal(next.status, 'waiting_for_network');
  });
});

describe('nextWakeUpAt', () => {
  it('returns the soonest scheduled retry', () => {
    const wake = nextWakeUpAt(
      [
        { status: 'retry_scheduled', attemptCount: 1, nextRetryAt: '2026-08-12T20:05:00.000Z' },
        { status: 'retry_scheduled', attemptCount: 1, nextRetryAt: '2026-08-12T20:01:00.000Z' },
        { status: 'queued', attemptCount: 0 },
      ],
      NOW,
    );
    assert.equal(wake?.toISOString(), '2026-08-12T20:01:00.000Z');
  });

  it('returns now when something is already due', () => {
    const wake = nextWakeUpAt(
      [{ status: 'retry_scheduled', attemptCount: 1, nextRetryAt: '2026-08-12T19:00:00.000Z' }],
      NOW,
    );
    assert.equal(wake?.getTime(), NOW.getTime());
  });

  it('returns null when nothing is waiting on a clock', () => {
    assert.equal(nextWakeUpAt([{ status: 'queued', attemptCount: 0 }], NOW), null);
    assert.equal(nextWakeUpAt([], NOW), null);
  });
});

describe('reconcileOnLaunch', () => {
  it('requeues jobs the previous process died holding', () => {
    const [job] = reconcileOnLaunch([{ status: 'uploading', attemptCount: 2 }]);
    assert.equal(job?.status, 'queued');
    assert.equal(job?.attemptCount, 2, 'the attempt is not lost, only the in-flight claim');
  });

  it('does not resurrect terminal jobs or disturb the rest', () => {
    const jobs = reconcileOnLaunch([
      { status: 'failed', attemptCount: 9 },
      { status: 'completed', attemptCount: 1 },
      { status: 'waiting_for_network', attemptCount: 0 },
    ]);
    assert.deepEqual(
      jobs.map((job) => job.status),
      ['failed', 'completed', 'waiting_for_network'],
    );
  });

  it('never marks an interrupted upload as failed', () => {
    const jobs = reconcileOnLaunch([{ status: 'uploading', attemptCount: 1 }]);
    assert.ok(jobs.every((job) => job.status !== 'failed'));
  });
});
