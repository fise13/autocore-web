/**
 * Trends explain change (IA §7).
 *
 * A trend is not a second printing of a Summary number: it states a direction,
 * how big it is against the window before, and what that means for the reader.
 * Every sentence is rule-generated from the comparison the metric already
 * carried, so a trend can never claim a movement the ledger cannot support.
 *
 * Two kinds get a card, and the difference between them is stated out loud:
 *
 *   - a **change** — the previous window had something to divide by, so the card
 *     can name a percentage and say whether it is welcome;
 *   - a **shape** — no baseline exists, but the series inside the window moves,
 *     and that picture is worth seeing. The copy says there is nothing to
 *     compare against rather than inventing "up from nothing".
 *
 * A new company would otherwise never see this section at all, and hiding a
 * real week of daily revenue because last week was empty helps nobody.
 */
import type { HomeMetric, HomeTrend, HomeTrendSignificance } from '../types';

export const HOME_MAX_TRENDS = 2;

/** Below `notable` the movement is noise for a shop-floor brief. */
const MILD_THRESHOLD = 5;
const NOTABLE_THRESHOLD = 15;
const SEVERE_THRESHOLD = 40;

export function trendSignificance(deltaPercent: number): HomeTrendSignificance | null {
  const magnitude = Math.abs(deltaPercent);
  if (magnitude < MILD_THRESHOLD) return null;
  if (magnitude < NOTABLE_THRESHOLD) return 'mild';
  if (magnitude < SEVERE_THRESHOLD) return 'notable';
  return 'severe';
}

function windowNoun(comparisonLabel: string): string {
  return comparisonLabel.replace(/^vs previous /i, '');
}

function toneFor(metric: HomeMetric, rising: boolean): HomeTrend['tone'] {
  if (metric.polarity === 'neutral') return 'neutral';
  const good = metric.polarity === 'higher_better' ? rising : !rising;
  return good ? 'positive' : 'negative';
}

function explanationFor(
  metric: HomeMetric,
  rising: boolean,
  magnitude: number,
  significance: HomeTrendSignificance,
  tone: HomeTrend['tone'],
): string {
  const noun = windowNoun(metric.comparison?.label ?? '');
  const lead = `${metric.title} is ${magnitude}% ${rising ? 'higher' : 'lower'} than the previous ${noun}.`;
  if (significance !== 'severe') return lead;
  if (tone === 'negative') return `${lead} Worth a look before it compounds.`;
  if (tone === 'positive') return `${lead} The shift is large enough to plan around.`;
  return lead;
}

/**
 * The reference line: what a single bucket averaged last time round.
 *
 * A window total cannot be drawn against a per-bucket series — a weekly total
 * plotted over daily points would sit far above every one of them and read as a
 * target nobody set. Dividing by the bucket count puts the line in the same
 * units as the curve it explains.
 */
function baselineFor(metric: HomeMetric): number | null {
  const previous = metric.comparison?.previousValue;
  const buckets = metric.trendSeries?.length ?? 0;
  if (previous === undefined || buckets === 0) return null;
  // Nothing happened last period, so there is no average to hold the current
  // series up against. A grey line pinned to zero is not a reference — it is a
  // second axis the reader has to work out how to ignore.
  if (previous === 0) return null;
  return previous / buckets;
}

function valuesFor(metric: HomeMetric): HomeTrend['values'] {
  return {
    current: metric.value ?? 0,
    previous: metric.comparison?.previousValue ?? null,
    baseline: baselineFor(metric),
  };
}

function changeTrend(metric: HomeMetric): { trend: HomeTrend; magnitude: number } | null {
  const deltaPercent = metric.comparison?.deltaPercent;
  if (deltaPercent === null || deltaPercent === undefined) return null;

  const significance = trendSignificance(deltaPercent);
  if (significance !== 'notable' && significance !== 'severe') return null;

  const rising = deltaPercent > 0;
  const magnitude = Math.abs(deltaPercent);
  const tone = toneFor(metric, rising);

  return {
    magnitude,
    trend: {
      id: `trend:${metric.id}`,
      metricId: metric.id,
      title: metric.title,
      unit: metric.unit,
      explanation: explanationFor(metric, rising, magnitude, significance, tone),
      direction: rising ? 'up' : 'down',
      deltaPercent,
      significance,
      tone,
      comparisonLabel: metric.comparison?.label ?? '',
      series: metric.trendSeries,
      values: valuesFor(metric),
      destination: metric.destination,
    },
  };
}

/**
 * A window with a shape but no baseline.
 *
 * The card carries the chart and says exactly what it is. It claims no
 * direction, because across a single window "up" depends entirely on where you
 * start reading.
 */
function shapeTrend(metric: HomeMetric, periodLabel: string): HomeTrend | null {
  if (!metric.trendSeries || metric.trendSeries.length < 2) return null;

  // The metric builder already drops series that do not move, but a shape trend
  // exists *only* to show movement — so it checks rather than assumes. A flat
  // line given a card is the decorative chart this section is meant to avoid.
  const values = metric.trendSeries.map((point) => point.value);
  if (Math.max(...values) === Math.min(...values)) return null;

  return {
    id: `trend:${metric.id}`,
    metricId: metric.id,
    title: metric.title,
    unit: metric.unit,
    explanation: `${metric.title} across the ${periodLabel.toLowerCase()}. No earlier period to compare against yet.`,
    direction: 'unknown',
    deltaPercent: null,
    significance: 'none',
    tone: 'neutral',
    comparisonLabel: periodLabel,
    series: metric.trendSeries,
    values: valuesFor(metric),
    destination: metric.destination,
  };
}

/**
 * Build up to two narratives from the ranked, gated candidate pool.
 *
 * Summary metrics are deliberately not excluded — on a high-sales day the same
 * family should both lead the Summary and explain itself in Trends (IA §6.2).
 * What is excluded is a restated number without a story: a movement smaller than
 * `notable` gets no card, and neither does a flat series.
 */
export function buildHomeTrends(
  eligible: HomeMetric[],
  periodLabel: string,
  max = HOME_MAX_TRENDS,
): HomeTrend[] {
  const changes = eligible
    .map(changeTrend)
    .filter((entry): entry is { trend: HomeTrend; magnitude: number } => entry !== null)
    .sort((left, right) => {
      if (right.magnitude !== left.magnitude) return right.magnitude - left.magnitude;
      return left.trend.metricId.localeCompare(right.trend.metricId);
    })
    .map((entry) => entry.trend);

  if (changes.length >= max) return changes.slice(0, max);

  // Only then fall back to shapes, and never for a metric that already spoke.
  //
  // These keep the pool's own order rather than being re-sorted. The pool is
  // already ranked by relevance with `id` as the tiebreak, so it is both
  // deterministic and meaningful — sorting alphabetically here would put
  // Expenses ahead of Revenue for no reason a reader could name.
  const taken = new Set(changes.map((trend) => trend.metricId));
  const shapes = eligible
    .filter((metric) => !taken.has(metric.id))
    .map((metric) => shapeTrend(metric, periodLabel))
    .filter((trend): trend is HomeTrend => trend !== null);

  return [...changes, ...shapes].slice(0, Math.max(0, max));
}

/** Whether the section has anything at all to draw or say. */
export function hasTrendMaterial(eligible: HomeMetric[]): boolean {
  return eligible.some(
    (metric) =>
      typeof metric.comparison?.deltaPercent === 'number' ||
      (metric.trendSeries !== null && metric.trendSeries.length > 1),
  );
}
