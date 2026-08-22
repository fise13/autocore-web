import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { HomeMetric, HomeMetricId, HomeMetricScores } from '../types';
import {
  HOME_MAX_PER_FAMILY,
  HOME_MAX_PINNED,
  HOME_MIN_DATA_QUALITY,
  rankHomeMetrics,
  scoreHomeMetric,
} from './ranking';

const ZERO_SCORES: HomeMetricScores = {
  businessImportance: 0,
  urgency: 0,
  anomaly: 0,
  changeSignificance: 0,
  recency: 0,
  roleRelevance: 0,
  userPreference: 0,
  dataQuality: 0,
};

function metric(
  id: HomeMetricId,
  scores: Partial<HomeMetricScores> = {},
  overrides: Partial<HomeMetric> = {},
): HomeMetric {
  return {
    id,
    family: 'orders',
    title: id,
    value: 1,
    displayValue: '1',
    unit: 'count',
    periodLabel: 'Now',
    polarity: 'neutral',
    comparison: null,
    trendSeries: null,
    note: null,
    scores: { ...ZERO_SCORES, dataQuality: 0.9, ...scores },
    relevanceScore: 0,
    destination: null,
    unavailableReason: null,
    ...overrides,
  };
}

describe('scoreHomeMetric', () => {
  it('weighs urgency above every other input', () => {
    const urgent = scoreHomeMetric({ ...ZERO_SCORES, urgency: 1 });
    const important = scoreHomeMetric({ ...ZERO_SCORES, businessImportance: 1 });
    const recent = scoreHomeMetric({ ...ZERO_SCORES, recency: 1 });

    assert.ok(urgent > important);
    assert.ok(important > recent);
  });

  it('is stable for identical inputs', () => {
    const scores: HomeMetricScores = {
      ...ZERO_SCORES,
      urgency: 0.731,
      anomaly: 0.244,
      businessImportance: 0.8,
      dataQuality: 0.9,
    };
    assert.equal(scoreHomeMetric(scores), scoreHomeMetric({ ...scores }));
  });
});

describe('rankHomeMetrics', () => {
  it('orders by score and breaks ties on id, never at random', () => {
    const tied = { urgency: 0.5, businessImportance: 0.5 };
    const first = rankHomeMetrics([
      metric('parts.available', tied),
      metric('orders.open', tied),
      metric('engines.available', tied),
    ]);
    const second = rankHomeMetrics([
      metric('engines.available', tied),
      metric('orders.open', tied),
      metric('parts.available', tied),
    ]);

    assert.deepEqual(
      first.summary.map((entry) => entry.id),
      ['engines.available', 'orders.open', 'parts.available'],
    );
    assert.deepEqual(
      first.summary.map((entry) => entry.id),
      second.summary.map((entry) => entry.id),
    );
  });

  it('never leads with money just because money exists', () => {
    const ranked = rankHomeMetrics([
      metric('cash.balance', { businessImportance: 0.85, roleRelevance: 0.8, urgency: 0.2 }, {
        family: 'money',
      }),
      metric('parts.low_stock', { businessImportance: 0.65, roleRelevance: 0.65, urgency: 0.95 }, {
        family: 'parts',
      }),
    ]);

    assert.equal(ranked.summary[0].id, 'parts.low_stock');
  });

  it('drops candidates below the data-quality gate', () => {
    const ranked = rankHomeMetrics([
      metric('orders.open', { dataQuality: HOME_MIN_DATA_QUALITY - 0.01, urgency: 1 }),
      metric('parts.available', { dataQuality: 0.9, urgency: 0.1 }),
    ]);

    assert.deepEqual(
      ranked.summary.map((entry) => entry.id),
      ['parts.available'],
    );
  });

  it('excludes unknown values rather than ranking them as zero', () => {
    const ranked = rankHomeMetrics([
      metric('orders.open', { urgency: 1 }, { value: null }),
      metric('parts.available', { urgency: 0.1 }),
    ]);

    assert.deepEqual(
      ranked.summary.map((entry) => entry.id),
      ['parts.available'],
    );
  });

  it('excludes candidates that named a reason they cannot be shown', () => {
    const ranked = rankHomeMetrics([
      metric('money.revenue', { urgency: 1 }, { unavailableReason: 'no_permission' }),
      metric('orders.open', { urgency: 0.1 }),
    ]);

    assert.deepEqual(
      ranked.summary.map((entry) => entry.id),
      ['orders.open'],
    );
  });

  it('honours pins ahead of score but caps how much of Summary they take', () => {
    const ranked = rankHomeMetrics(
      [
        metric('orders.open', { urgency: 1 }),
        metric('parts.available', { urgency: 0.9 }),
        metric('engines.available', { urgency: 0.1 }),
        metric('cash.balance', { urgency: 0.05 }),
        metric('money.net', { urgency: 0.02 }),
      ],
      { pinned: ['money.net', 'cash.balance', 'engines.available'], hidden: [] },
      4,
    );

    assert.equal(HOME_MAX_PINNED, 2);
    assert.deepEqual(
      ranked.summary.map((entry) => entry.id),
      ['money.net', 'cash.balance', 'orders.open', 'parts.available'],
    );
  });

  it('removes hidden metrics entirely', () => {
    const ranked = rankHomeMetrics(
      [metric('orders.open', { urgency: 1 }), metric('parts.available', { urgency: 0.5 })],
      { pinned: [], hidden: ['orders.open'] },
    );

    assert.deepEqual(
      ranked.eligible.map((entry) => entry.id),
      ['parts.available'],
    );
  });

  it('will not fill Summary with one family, however high it scores', () => {
    const ranked = rankHomeMetrics(
      [
        metric('money.revenue', { urgency: 0.9 }, { family: 'money' }),
        metric('money.net', { urgency: 0.85 }, { family: 'money' }),
        metric('money.expense', { urgency: 0.8 }, { family: 'money' }),
        metric('cash.balance', { urgency: 0.75 }, { family: 'money' }),
        metric('orders.open', { urgency: 0.2 }, { family: 'orders' }),
        metric('parts.available', { urgency: 0.1 }, { family: 'parts' }),
      ],
      undefined,
      4,
    );

    assert.equal(HOME_MAX_PER_FAMILY, 2);
    assert.deepEqual(
      ranked.summary.map((entry) => entry.id),
      ['money.revenue', 'money.net', 'orders.open', 'parts.available'],
    );
  });

  it('relaxes the family cap rather than shipping a half-empty brief', () => {
    const ranked = rankHomeMetrics(
      [
        metric('money.revenue', { urgency: 0.9 }, { family: 'money' }),
        metric('money.net', { urgency: 0.85 }, { family: 'money' }),
        metric('money.expense', { urgency: 0.8 }, { family: 'money' }),
      ],
      undefined,
      4,
    );

    assert.equal(ranked.summary.length, 3);
  });

  it('seats a pin regardless of score, but spends its family budget doing so', () => {
    const ranked = rankHomeMetrics(
      [
        metric('money.revenue', { urgency: 0.9 }, { family: 'money' }),
        metric('money.net', { urgency: 0.85 }, { family: 'money' }),
        metric('cash.balance', { urgency: 0.1 }, { family: 'money' }),
        metric('orders.open', { urgency: 0.5 }, { family: 'orders' }),
        metric('parts.available', { urgency: 0.4 }, { family: 'parts' }),
      ],
      { pinned: ['cash.balance'], hidden: [] },
      3,
    );

    // The pin is seated ahead of higher-scoring money metrics, and money is then
    // full — pinning does not buy the ledger a third seat.
    assert.deepEqual(
      ranked.summary.map((entry) => entry.id),
      ['cash.balance', 'money.revenue', 'orders.open'],
    );
  });

  it('caps Summary while keeping the full eligible pool for Trends', () => {
    const ranked = rankHomeMetrics(
      [
        metric('orders.open', { urgency: 0.9 }),
        metric('orders.new', { urgency: 0.8 }),
        metric('parts.available', { urgency: 0.7 }),
        metric('engines.available', { urgency: 0.6 }),
        metric('cash.balance', { urgency: 0.5 }),
      ],
      undefined,
      2,
    );

    assert.equal(ranked.summary.length, 2);
    assert.equal(ranked.eligible.length, 5);
  });
});
