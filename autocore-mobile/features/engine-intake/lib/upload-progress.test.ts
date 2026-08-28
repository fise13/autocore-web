import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aggregateUploadProgress,
  pickUploadProgress,
  PROGRESS_NOTIFY_INTERVAL_MS,
  shouldNotifyProgress,
} from './upload-progress';

describe('aggregateUploadProgress', () => {
  it('sums bytes across parallel uploads', () => {
    const result = aggregateUploadProgress({
      a: { bytesSent: 50, totalBytes: 100 },
      b: { bytesSent: 25, totalBytes: 100 },
    });
    assert.equal(result.bytesSent, 75);
    assert.equal(result.totalBytes, 200);
    assert.equal(result.ratio, 0.375);
  });

  it('reports no ratio when nothing has a usable total', () => {
    const result = aggregateUploadProgress({ a: { bytesSent: 10, totalBytes: 0 } });
    assert.equal(result.ratio, null);
    assert.equal(result.totalBytes, 0);
  });

  it('never lets a retried task push past 100%', () => {
    const result = aggregateUploadProgress({ a: { bytesSent: 500, totalBytes: 100 } });
    assert.equal(result.ratio, 1);
  });

  it('ignores entries with junk numbers instead of producing NaN', () => {
    const result = aggregateUploadProgress({
      good: { bytesSent: 40, totalBytes: 80 },
      nan: { bytesSent: Number.NaN, totalBytes: 100 },
      negative: { bytesSent: -5, totalBytes: 100 },
    });
    assert.equal(result.bytesSent, 40);
    assert.equal(result.totalBytes, 80);
    assert.equal(result.ratio, 0.5);
  });

  it('is empty for no uploads', () => {
    assert.deepEqual(aggregateUploadProgress({}), { bytesSent: 0, totalBytes: 0, ratio: null });
  });
});

describe('pickUploadProgress', () => {
  it('keeps only the requested photo ids', () => {
    const picked = pickUploadProgress(
      {
        a: { bytesSent: 10, totalBytes: 100 },
        b: { bytesSent: 20, totalBytes: 100 },
      },
      ['b'],
    );
    assert.deepEqual(picked, { b: { bytesSent: 20, totalBytes: 100 } });
  });
});

describe('shouldNotifyProgress', () => {
  it('always notifies the first tick', () => {
    assert.equal(
      shouldNotifyProgress({ lastNotifiedAt: null, now: 1_000, bytesSent: 1, totalBytes: 100 }),
      true,
    );
  });

  it('drops ticks inside the throttle window', () => {
    assert.equal(
      shouldNotifyProgress({ lastNotifiedAt: 1_000, now: 1_050, bytesSent: 10, totalBytes: 100 }),
      false,
    );
  });

  it('notifies once the window has passed', () => {
    assert.equal(
      shouldNotifyProgress({
        lastNotifiedAt: 1_000,
        now: 1_000 + PROGRESS_NOTIFY_INTERVAL_MS,
        bytesSent: 10,
        totalBytes: 100,
      }),
      true,
    );
  });

  it('always notifies completion so the bar never freezes just short of full', () => {
    assert.equal(
      shouldNotifyProgress({ lastNotifiedAt: 1_000, now: 1_001, bytesSent: 100, totalBytes: 100 }),
      true,
    );
  });
});
