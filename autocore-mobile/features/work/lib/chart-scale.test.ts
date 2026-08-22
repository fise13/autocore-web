import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeChartScale,
  markerStride,
  niceStep,
  nextNiceStep,
  normalizeToScale,
  prevNiceStep,
  scaleToX,
  scaleToY,
  showsMarker,
  type ChartScale,
} from './chart-scale';

function scaleOf(values: number[], options = {}): ChartScale {
  const scale = computeChartScale(values, options);
  assert.ok(scale, 'expected a scale');
  return scale;
}

describe('niceStep', () => {
  it('snaps to 1 / 2 / 2.5 / 5 × 10ⁿ', () => {
    assert.equal(niceStep(0.8), 1);
    assert.equal(niceStep(1.3), 2);
    assert.equal(niceStep(2.1), 2.5);
    assert.equal(niceStep(3), 5);
    assert.equal(niceStep(7), 10);
    assert.equal(niceStep(30), 50);
    assert.equal(niceStep(0.03), 0.05);
  });

  it('drops the 2.5 step for integer metrics', () => {
    assert.equal(niceStep(2.1, true), 5);
    assert.equal(niceStep(0.3, true), 1);
  });

  it('walks up and down the ladder', () => {
    assert.equal(nextNiceStep(2), 2.5);
    assert.equal(nextNiceStep(5), 10);
    assert.equal(nextNiceStep(10), 20);
    assert.equal(prevNiceStep(2), 1);
    assert.equal(prevNiceStep(1), 0.5);
    assert.equal(prevNiceStep(1, true), 1, 'integer steps never go below 1');
  });
});

describe('computeChartScale', () => {
  it('returns null for an empty dataset so the caller can show an empty state', () => {
    assert.equal(computeChartScale([]), null);
    assert.equal(computeChartScale([Number.NaN, Number.POSITIVE_INFINITY]), null);
  });

  it('keeps 3–5 levels across wildly different datasets', () => {
    const datasets = [
      [1, 2, 3],
      [7, 7, 7, 7, 9],
      [0, 0, 0, 0],
      [12, 480, 33, 27, 41],
      [1200, 1180, 1240, 1190],
      [0.2, 0.35, 0.28],
      [-40, -12, -33],
    ];
    for (const values of datasets) {
      const scale = scaleOf(values, { allowNegative: true });
      assert.ok(
        scale.ticks.length >= 3 && scale.ticks.length <= 5,
        `${JSON.stringify(values)} produced ${scale.ticks.length} ticks`,
      );
      for (const tick of scale.ticks) {
        assert.ok(
          tick >= scale.min - 1e-9 && tick <= scale.max + 1e-9,
          `tick ${tick} escapes [${scale.min}, ${scale.max}]`,
        );
      }
    }
  });

  it('never clips a real value or an outlier', () => {
    const values = [12, 480, 33, 27, 41];
    const scale = scaleOf(values);
    assert.ok(scale.min <= 12);
    assert.ok(scale.max >= 480);
    assert.equal(scale.dataMin, 12);
    assert.equal(scale.dataMax, 480);
  });

  it('does not include zero just because the data sits far above it', () => {
    const scale = scaleOf([1200, 1180, 1240, 1190]);
    assert.ok(scale.min > 1000, `expected a tight axis, got min ${scale.min}`);
  });

  it('includes zero when the metric declares a zero baseline', () => {
    const scale = scaleOf([1200, 1180, 1240, 1190], { zeroBaseline: true });
    assert.equal(scale.min, 0);
    assert.ok(scale.max >= 1240);
  });

  it('clamps padding at zero for non-negative metrics', () => {
    const scale = scaleOf([0, 1, 2, 3]);
    assert.equal(scale.min, 0);
  });

  it('allows a negative axis when the data is negative', () => {
    const scale = scaleOf([-40, -12, -33], { allowNegative: true });
    assert.ok(scale.min <= -40);
    assert.ok(scale.max >= -12);
  });

  it('gives a flat dataset a real window instead of a zero span', () => {
    const scale = scaleOf([7, 7, 7, 7], { integer: true, minVisualRange: 4 });
    assert.ok(scale.max - scale.min >= 4);
    assert.ok(scale.min <= 7 && scale.max >= 7);
  });

  it('keeps the minimum window after clamping a flat zero series at zero', () => {
    const scale = scaleOf([0, 0, 0, 0], { integer: true, minVisualRange: 4 });
    assert.equal(scale.min, 0);
    assert.ok(scale.max - scale.min >= 4, 'the zero clamp must not eat the window');
  });

  it('honours the minimum visual range so a ±1 wiggle is not dramatised', () => {
    const tight = scaleOf([7, 8, 7, 8], { integer: true, minVisualRange: 6 });
    assert.ok(tight.max - tight.min >= 6);
  });

  it('keeps padding proportional — 10–20% of the data range', () => {
    const scale = scaleOf([100, 200]);
    const headroom = scale.max - 200;
    const footroom = 100 - scale.min;
    assert.ok(headroom >= 100 * 0.1 - 1e-9 && headroom <= 100 * 0.2 + 1e-9);
    assert.ok(footroom >= 100 * 0.1 - 1e-9 && footroom <= 100 * 0.2 + 1e-9);
  });

  it('gives every dataset the same share of the plot, so readings compare', () => {
    // The axis is the padded data range — not the tick lattice rounded outward.
    // Occupancy therefore stays put whether the series is 5–10 or 640–671.
    const datasets = [
      [5, 6, 7, 9, 10],
      [640, 650, 655, 648, 671],
      [14, 22, 30, 40],
      [0.4, 0.8, 1.2],
    ];
    for (const values of datasets) {
      const scale = scaleOf(values);
      const occupancy = scale.dataRange / (scale.max - scale.min);
      assert.ok(
        occupancy > 0.7 && occupancy <= 1,
        `${JSON.stringify(values)} filled ${occupancy.toFixed(2)} of the axis`,
      );
    }
  });

  it('places ticks inside the axis instead of inflating it', () => {
    const scale = scaleOf([5, 6, 7, 9, 10], { integer: true });
    assert.ok(scale.min > 3, `axis floor ${scale.min} drifted far below the data`);
    assert.ok(scale.max < 13, `axis ceiling ${scale.max} drifted far above the data`);
  });

  it('pulls average companions onto the same axis', () => {
    const scale = scaleOf([5, 6, 7], { companions: [42] });
    assert.ok(scale.max >= 42, 'a companion outside the series must still fit');
    assert.equal(scale.dataMax, 7, 'companions do not rewrite the data extent');
  });

  it('produces whole-unit ticks for count metrics', () => {
    const scale = scaleOf([3, 4, 9, 6], { integer: true });
    for (const tick of scale.ticks) {
      assert.equal(tick, Math.round(tick), `tick ${tick} is not a whole count`);
    }
  });

  it('recomputes from scratch when the data changes', () => {
    const before = scaleOf([7, 7, 8], { integer: true, minVisualRange: 4 });
    const after = scaleOf([7, 7, 8, 260], { integer: true, minVisualRange: 4 });
    assert.notEqual(before.max, after.max);
    assert.ok(after.max >= 260);
  });

  it('does not turn a large range into a vertical wall', () => {
    const scale = scaleOf([5, 5, 5, 5, 900], { integer: true });
    // The outlier is kept (rule: never drop it) and the axis still reads in
    // human steps rather than one gridline per hundred.
    assert.ok(normalizeToScale(scale, 5) >= 0);
    assert.ok(normalizeToScale(scale, 900) <= 1);
    assert.ok(scale.ticks.length >= 3 && scale.ticks.length <= 5);
  });
});

describe('projection', () => {
  it('maps values onto the plot without touching the values', () => {
    const scale = scaleOf([0, 10], { zeroBaseline: true });
    assert.equal(normalizeToScale(scale, scale.min), 0);
    assert.equal(normalizeToScale(scale, scale.max), 1);
    const top = scaleToY(scale, scale.max, 20, 100);
    const bottom = scaleToY(scale, scale.min, 20, 100);
    assert.equal(top, 20);
    assert.equal(bottom, 120);
  });

  it('spreads points evenly across X and centres a lone point', () => {
    assert.equal(scaleToX(0, 5, 10, 200), 10);
    assert.equal(scaleToX(4, 5, 10, 200), 210);
    assert.equal(scaleToX(2, 5, 10, 200), 110);
    assert.equal(scaleToX(0, 1, 10, 200), 110);
  });
});

describe('marker thinning', () => {
  it('shows every marker when the points have room', () => {
    assert.equal(markerStride(18, 340, 14), 1);
    assert.ok(showsMarker(7, 18, 1));
  });

  it('thins markers when points crowd, keeping first and last', () => {
    const stride = markerStride(60, 300, 14);
    assert.ok(stride > 1);
    assert.ok(showsMarker(0, 60, stride));
    assert.ok(showsMarker(59, 60, stride));
    const drawn = Array.from({ length: 60 }, (_, i) => showsMarker(i, 60, stride)).filter(
      Boolean,
    ).length;
    assert.ok(drawn < 60, 'some markers must be dropped');
    assert.ok(drawn >= 3, 'the series must stay readable');
  });
});
