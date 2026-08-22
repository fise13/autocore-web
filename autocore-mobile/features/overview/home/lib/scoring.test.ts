import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  anomalyScore,
  buildComparison,
  changeSignificanceScore,
  recencyScore,
  seriesIsUseful,
} from './metrics';

function series(values: number[]) {
  return values.map((value, index) => ({ label: String(index), value }));
}

describe('anomalyScore', () => {
  it('ignores the final bucket, which is still in progress', () => {
    // Steady week, then a zero for "today so far" — not an anomaly.
    assert.equal(anomalyScore(series([10, 10, 10, 10, 10, 10, 0])), 0);
  });

  it('reads a genuine spike in the last complete bucket', () => {
    assert.ok(anomalyScore(series([10, 10, 10, 10, 10, 40, 3])) > 0.5);
  });

  it('is damped when there is no history to measure against', () => {
    assert.equal(anomalyScore(series([0, 0, 0, 0, 0, 500, 0])), 0.25);
  });

  it('says nothing about a series too short to have a history', () => {
    assert.equal(anomalyScore(series([1, 2, 3])), 0);
    assert.equal(anomalyScore(null), 0);
  });
});

describe('recencyScore', () => {
  const now = new Date('2026-08-18T10:30:00.000Z');

  it('is highest for something that just happened', () => {
    assert.equal(recencyScore(new Date('2026-08-18T10:00:00.000Z'), now), 1);
  });

  it('decays to nothing over three days', () => {
    assert.equal(recencyScore(new Date('2026-08-15T10:00:00.000Z'), now), 0);
  });

  it('buckets to whole hours so reopening minutes later does not reshuffle the brief', () => {
    const event = new Date('2026-08-18T05:00:00.000Z');
    const opened = recencyScore(event, now);
    const reopened = recencyScore(event, new Date('2026-08-18T10:59:00.000Z'));
    assert.equal(opened, reopened);
  });

  it('scores an unknown timestamp as no signal, not as fresh', () => {
    assert.equal(recencyScore(null, now), 0);
  });
});

describe('buildComparison', () => {
  it('refuses a percentage when the baseline was zero', () => {
    const comparison = buildComparison(40, 0, 'vs previous 7 days');
    assert.equal(comparison?.deltaPercent, null);
    assert.equal(comparison?.delta, 40);
  });

  it('has nothing to say when both windows are empty', () => {
    assert.equal(buildComparison(0, 0, 'vs previous 7 days'), null);
  });

  it('rounds the percentage so float noise cannot reorder the brief', () => {
    const comparison = buildComparison(1, 3, 'vs previous 7 days');
    assert.equal(comparison?.deltaPercent, -66.7);
  });
});

describe('changeSignificanceScore', () => {
  it('scores nothing without a usable percentage', () => {
    assert.equal(changeSignificanceScore(null), 0);
    assert.equal(
      changeSignificanceScore({ previousValue: 0, delta: 5, deltaPercent: null, label: '' }),
      0,
    );
  });

  it('saturates at a large swing rather than growing without bound', () => {
    const big = changeSignificanceScore({
      previousValue: 1,
      delta: 100,
      deltaPercent: 10_000,
      label: '',
    });
    assert.equal(big, 1);
  });
});

describe('seriesIsUseful', () => {
  it('rejects an empty week and a line that never moves', () => {
    assert.equal(seriesIsUseful(series([0, 0, 0, 0, 0])), false);
    assert.equal(seriesIsUseful(series([5, 5, 5, 5, 5])), false);
  });

  it('rejects a series too short to read', () => {
    assert.equal(seriesIsUseful(series([1, 4, 9])), false);
  });

  it('accepts a series that actually moves', () => {
    assert.equal(seriesIsUseful(series([1, 4, 2, 9, 3])), true);
  });
});
