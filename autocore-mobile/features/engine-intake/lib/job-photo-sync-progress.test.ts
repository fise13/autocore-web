import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  companyPhotoSyncQueue,
  countJobOutboxPhotos,
  jobPhotoSyncByJobId,
  jobPhotoSyncProgress,
} from './job-photo-sync-progress';

describe('jobPhotoSyncProgress', () => {
  it('returns null when the job has nothing in the outbox', () => {
    assert.equal(
      jobPhotoSyncProgress({
        counts: { pending: 0, uploading: 0, failed: 0, completed: 0 },
        byteRatio: null,
      }),
      null,
    );
  });

  it('uses byte ratio to move the bar while photos are on the wire', () => {
    const progress = jobPhotoSyncProgress({
      counts: { pending: 0, uploading: 2, failed: 0, completed: 5 },
      byteRatio: 0.5,
    });
    assert.ok(progress);
    assert.equal(progress.ratio, (5 + 1) / 7);
    assert.equal(progress.label, '5/7 uploaded');
  });

  it('falls back to counts when native progress has no totals', () => {
    const progress = jobPhotoSyncProgress({
      counts: { pending: 3, uploading: 1, failed: 0, completed: 3 },
      byteRatio: null,
    });
    assert.ok(progress);
    assert.equal(progress.ratio, 3 / 7);
  });

  it('surfaces a failed-only queue', () => {
    const progress = jobPhotoSyncProgress({
      counts: { pending: 0, uploading: 0, failed: 2, completed: 0 },
      byteRatio: null,
    });
    assert.ok(progress);
    assert.equal(progress.ratio, 0);
    assert.equal(progress.label, '2 photos failed');
  });
});

describe('countJobOutboxPhotos', () => {
  it('skips conflict rows and buckets the rest', () => {
    assert.deepEqual(
      countJobOutboxPhotos([
        { id: 'a', jobId: 'j1', companyId: 'c', status: 'queued' },
        { id: 'b', jobId: 'j1', companyId: 'c', status: 'uploading' },
        { id: 'c', jobId: 'j1', companyId: 'c', status: 'completed' },
        { id: 'd', jobId: 'j1', companyId: 'c', status: 'failed' },
        {
          id: 'e',
          jobId: 'j1',
          companyId: 'c',
          status: 'failed',
          errorInfo: { code: 'CONFLICT' },
        },
      ]),
      { pending: 1, uploading: 1, failed: 1, completed: 1 },
    );
  });
});

describe('jobPhotoSyncByJobId', () => {
  it('builds a bar per job from outbox rows and live bytes', () => {
    const bars = jobPhotoSyncByJobId({
      companyId: 'c',
      byteProgress: { u1: { bytesSent: 50, totalBytes: 100 } },
      photos: [
        { id: 'u1', jobId: 'job-a', companyId: 'c', status: 'uploading' },
        { id: 'p1', jobId: 'job-a', companyId: 'c', status: 'queued' },
        { id: 'x', jobId: 'job-b', companyId: 'other', status: 'uploading' },
      ],
    });
    const bar = bars.get('job-a');
    assert.ok(bar);
    assert.equal(bar.ratio, 0.25);
    assert.equal(bar.label, '0/2 uploaded');
    assert.equal(bars.has('job-b'), false);
  });

  it('does not count an already-on-server leftover as a fifth photo', () => {
    assert.deepEqual(
      countJobOutboxPhotos([
        { id: 'a', jobId: 'j1', companyId: 'c', status: 'completed' },
        { id: 'b', jobId: 'j1', companyId: 'c', status: 'completed' },
        { id: 'c', jobId: 'j1', companyId: 'c', status: 'completed' },
        { id: 'd', jobId: 'j1', companyId: 'c', status: 'completed' },
        {
          id: 'e',
          jobId: 'j1',
          companyId: 'c',
          status: 'failed',
          lastError: 'Photo is already recorded',
        },
      ]),
      { pending: 0, uploading: 0, failed: 0, completed: 4 },
    );
    assert.equal(
      jobPhotoSyncProgress({
        counts: { pending: 0, uploading: 0, failed: 0, completed: 4 },
        byteRatio: null,
      }),
      null,
    );
  });
});

describe('companyPhotoSyncQueue', () => {
  it('keeps the wave total after a finished photo is dropped from the outbox', () => {
    const queue = companyPhotoSyncQueue({
      syncedCount: 1,
      sessionTotal: 2,
      photoPendingCount: 1,
      photoFailedCount: 0,
      byteProgress: {},
      photos: [{ id: 'p2', jobId: 'j', companyId: 'c', status: 'uploading' }],
    });
    assert.equal(queue.done, 1);
    assert.equal(queue.total, 2);
    assert.equal(queue.uploading, 1);
  });

  it('reads live bytes so the Island can move before a photo finalizes', () => {
    const queue = companyPhotoSyncQueue({
      syncedCount: 0,
      sessionTotal: 2,
      photoPendingCount: 2,
      photoFailedCount: 0,
      byteProgress: { u1: { bytesSent: 50, totalBytes: 100 } },
      photos: [
        { id: 'u1', jobId: 'j', companyId: 'c', status: 'uploading' },
        { id: 'p2', jobId: 'j', companyId: 'c', status: 'queued' },
      ],
    });
    assert.equal(queue.done, 0);
    assert.equal(queue.uploading, 1);
    assert.equal(queue.uploadRatio, 0.5);
  });

  it('keeps N/M when a settled photo left the outbox and syncedCount was wiped', () => {
    const queue = companyPhotoSyncQueue({
      syncedCount: 0,
      sessionTotal: 3,
      photoPendingCount: 2,
      photoFailedCount: 0,
      byteProgress: {},
      photos: [
        { id: 'p2', jobId: 'j', companyId: 'c', status: 'uploading' },
        { id: 'p3', jobId: 'j', companyId: 'c', status: 'queued' },
      ],
    });
    assert.equal(queue.done, 1);
    assert.equal(queue.total, 3);
  });

  it('does not count remaining files as a shrinking 0/N wave', () => {
    const mid = companyPhotoSyncQueue({
      syncedCount: 0,
      sessionTotal: 3,
      photoPendingCount: 1,
      photoFailedCount: 0,
      byteProgress: {},
      photos: [{ id: 'p3', jobId: 'j', companyId: 'c', status: 'uploading' }],
    });
    assert.equal(mid.done, 2);
    assert.equal(mid.total, 3);
  });
});
