import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { HomeMetric, HomeMetricId, HomeMetricPolarity, HomeSeriesPoint } from '../types';
import { homeMetricDestination } from './destinations';
import { buildHomeTrends, hasTrendMaterial, trendSignificance } from './trends';

const PERIOD = 'Last 7 days';

function series(values: number[]): HomeSeriesPoint[] {
  return values.map((value, index) => ({ label: `d${index}`, value }));
}

function metric(
  id: HomeMetricId,
  deltaPercent: number | null,
  polarity: HomeMetricPolarity = 'higher_better',
  title = id,
  trendSeries: HomeSeriesPoint[] | null = null,
): HomeMetric {
  return {
    id,
    family: 'money',
    title,
    value: 100,
    displayValue: null,
    unit: 'currency',
    periodLabel: PERIOD,
    polarity,
    comparison:
      deltaPercent === null
        ? null
        : { previousValue: 80, delta: 20, deltaPercent, label: 'vs previous 7 days' },
    trendSeries,
    note: null,
    scores: {
      businessImportance: 0,
      urgency: 0,
      anomaly: 0,
      changeSignificance: 0,
      recency: 0,
      roleRelevance: 0,
      userPreference: 0,
      dataQuality: 0.9,
    },
    relevanceScore: 0,
    destination: homeMetricDestination(id),
    unavailableReason: null,
  };
}

describe('trendSignificance', () => {
  it('treats small movement as no story at all', () => {
    assert.equal(trendSignificance(4.9), null);
    assert.equal(trendSignificance(-4.9), null);
  });

  it('grades by magnitude regardless of direction', () => {
    assert.equal(trendSignificance(10), 'mild');
    assert.equal(trendSignificance(-20), 'notable');
    assert.equal(trendSignificance(55), 'severe');
  });
});

describe('buildHomeTrends', () => {
  it('omits a movement below notable when it has no shape either', () => {
    assert.deepEqual(buildHomeTrends([metric('money.revenue', 9)], PERIOD), []);
  });

  it('claims no change when there is no baseline to compare against', () => {
    assert.deepEqual(buildHomeTrends([metric('money.revenue', null)], PERIOD), []);
  });

  it('keeps at most two, largest movement first', () => {
    const trends = buildHomeTrends(
      [
        metric('money.revenue', 20),
        metric('money.expense', 70, 'lower_better'),
        metric('money.net', -45),
      ],
      PERIOD,
    );

    assert.deepEqual(
      trends.map((trend) => trend.metricId),
      ['money.expense', 'money.net'],
    );
  });

  it('reads rising costs as negative and rising revenue as positive', () => {
    const [revenue] = buildHomeTrends([metric('money.revenue', 30)], PERIOD);
    const [expense] = buildHomeTrends([metric('money.expense', 30, 'lower_better')], PERIOD);

    assert.equal(revenue.tone, 'positive');
    assert.equal(expense.tone, 'negative');
  });

  it('leaves neutral families untinted', () => {
    const [orders] = buildHomeTrends([metric('orders.new', 30, 'neutral')], PERIOD);
    assert.equal(orders.tone, 'neutral');
  });

  it('states the movement in words, not just a percentage', () => {
    const [trend] = buildHomeTrends(
      [metric('money.revenue', 34, 'higher_better', 'Revenue')],
      PERIOD,
    );

    assert.equal(trend.direction, 'up');
    assert.equal(trend.explanation, 'Revenue is 34% higher than the previous 7 days.');
  });

  it('carries the signed percentage and unit so the card need not re-derive them', () => {
    const [up] = buildHomeTrends([metric('money.revenue', 34)], PERIOD);
    const [down] = buildHomeTrends([metric('money.net', -34)], PERIOD);

    assert.equal(up.deltaPercent, 34);
    assert.equal(up.unit, 'currency');
    assert.equal(down.deltaPercent, -34);
  });

  it('adds a consequence only when the movement is severe', () => {
    const [severe] = buildHomeTrends(
      [metric('money.net', -60, 'higher_better', 'Net profit')],
      PERIOD,
    );
    const [notable] = buildHomeTrends(
      [metric('money.net', -20, 'higher_better', 'Net profit')],
      PERIOD,
    );

    assert.ok(severe.explanation.endsWith('Worth a look before it compounds.'));
    assert.ok(!notable.explanation.includes('compounds'));
  });

  it('produces the same two trends for the same pool, in any input order', () => {
    const pool = [
      metric('money.revenue', 20),
      metric('money.expense', 70, 'lower_better'),
      metric('money.net', -45),
    ];
    const forwards = buildHomeTrends(pool, PERIOD).map((trend) => trend.id);
    const backwards = buildHomeTrends([...pool].reverse(), PERIOD).map((trend) => trend.id);

    assert.deepEqual(forwards, backwards);
  });

  it('sets the reference line in the same units as the curve it explains', () => {
    const [trend] = buildHomeTrends(
      [metric('money.revenue', 34, 'higher_better', 'Revenue', series([1, 2, 3, 4]))],
      PERIOD,
    );

    // previousValue 80 spread across 4 buckets — a weekly total drawn over daily
    // points would sit far above every one of them.
    assert.equal(trend.values.baseline, 20);
    assert.equal(trend.values.previous, 80);
  });
});

describe('a window with a shape but no baseline', () => {
  it('still earns a card, because the picture is real even if the comparison is not', () => {
    const [trend] = buildHomeTrends(
      [metric('money.revenue', null, 'higher_better', 'Revenue', series([1, 5, 2, 8]))],
      PERIOD,
    );

    assert.equal(trend.significance, 'none');
    assert.equal(trend.deltaPercent, null);
    assert.equal(trend.direction, 'unknown');
  });

  it('says plainly that there is nothing to compare against', () => {
    const [trend] = buildHomeTrends(
      [metric('money.revenue', null, 'higher_better', 'Revenue', series([1, 5, 2, 8]))],
      PERIOD,
    );

    assert.equal(
      trend.explanation,
      'Revenue across the last 7 days. No earlier period to compare against yet.',
    );
  });

  it('never lets a shape push out a measured change', () => {
    const trends = buildHomeTrends(
      [
        metric('money.revenue', null, 'higher_better', 'Revenue', series([1, 5, 2, 8])),
        metric('money.net', 60, 'higher_better', 'Net profit'),
        metric('money.expense', 55, 'lower_better', 'Expenses'),
      ],
      PERIOD,
    );

    assert.deepEqual(
      trends.map((trend) => trend.metricId),
      ['money.net', 'money.expense'],
    );
  });

  it('does not draw a flat line as though it were a pattern', () => {
    assert.deepEqual(
      buildHomeTrends(
        [metric('money.revenue', null, 'higher_better', 'Revenue', series([4, 4, 4, 4]))],
        PERIOD,
      ),
      [],
    );
  });
});

describe('hasTrendMaterial', () => {
  it('is false when nothing can be compared or drawn', () => {
    assert.equal(hasTrendMaterial([metric('money.revenue', null)]), false);
  });

  it('is true on a comparable percentage alone', () => {
    assert.equal(hasTrendMaterial([metric('money.revenue', 3)]), true);
  });

  it('is true on a drawable series alone', () => {
    assert.equal(
      hasTrendMaterial([metric('money.revenue', null, 'higher_better', 'Revenue', series([1, 2]))]),
      true,
    );
  });
});
