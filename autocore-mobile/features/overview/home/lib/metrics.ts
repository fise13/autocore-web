/**
 * Home metric candidates — one pure builder per `HomeMetricId` (IA §3, §4).
 *
 * Every candidate reads `HomeFacts`, so a number on Home is the same number the
 * Attention section counted. Two rules hold throughout:
 *
 *   - `value: null` means "not known yet". It is never coerced to `0`, because a
 *     reader cannot tell a quiet warehouse from a listener that has not landed.
 *   - Queue metrics ("N things need you") are withheld at zero rather than shown
 *     as a proud `0`. Nothing needing attention is the absence of a metric, not a
 *     metric with the value nothing.
 *
 * Nothing here formats money or touches React — the file is testable with plain
 * fixtures.
 */
import { relativeChange } from '@/features/finance/lib/series';
import type { UserRole } from '@autocore/rbac';

import type {
  HomeMetric,
  HomeMetricComparison,
  HomeMetricFamily,
  HomeMetricId,
  HomeMetricPolarity,
  HomeMetricScores,
  HomeMetricUnavailableReason,
  HomeMetricUnit,
  HomeSeriesPoint,
} from '../types';
import { buildHomeFacts, type HomeFacts, type HomeSourceInput } from './facts';
import { homeMetricDestination } from './destinations';

/** ——— Determinism helpers ——— */

/**
 * Scores are functions of rounded inputs: float noise must not be able to
 * reorder a brief that is otherwise identical between two renders.
 */
export function round3(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1000) / 1000;
}

export function round1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const COUNT_FORMAT = new Intl.NumberFormat('en-US');

/** ——— Role priors (IA §5) ——— */

type FamilyPrior = { importance: number; relevance: number };

const OPERATOR_PRIORS: Record<HomeMetricFamily, FamilyPrior> = {
  money: { importance: 0.85, relevance: 0.8 },
  orders: { importance: 0.8, relevance: 0.85 },
  engines: { importance: 0.7, relevance: 0.7 },
  parts: { importance: 0.65, relevance: 0.65 },
  work: { importance: 0.45, relevance: 0.35 },
  payroll: { importance: 0.3, relevance: 0.2 },
  intake: { importance: 0.55, relevance: 0.5 },
};

const ACCOUNTANT_PRIORS: Record<HomeMetricFamily, FamilyPrior> = {
  money: { importance: 0.95, relevance: 0.95 },
  orders: { importance: 0.5, relevance: 0.4 },
  engines: { importance: 0.35, relevance: 0.3 },
  parts: { importance: 0.35, relevance: 0.3 },
  work: { importance: 0.3, relevance: 0.2 },
  payroll: { importance: 0.7, relevance: 0.7 },
  intake: { importance: 0.2, relevance: 0.15 },
};

const FLOOR_PRIORS: Record<HomeMetricFamily, FamilyPrior> = {
  money: { importance: 0.15, relevance: 0.1 },
  orders: { importance: 0.6, relevance: 0.55 },
  engines: { importance: 0.45, relevance: 0.4 },
  parts: { importance: 0.5, relevance: 0.45 },
  work: { importance: 0.9, relevance: 0.95 },
  payroll: { importance: 0.8, relevance: 0.85 },
  intake: { importance: 0.8, relevance: 0.8 },
};

const EMPLOYEE_PRIORS: Record<HomeMetricFamily, FamilyPrior> = {
  money: { importance: 0.2, relevance: 0.15 },
  orders: { importance: 0.55, relevance: 0.5 },
  engines: { importance: 0.5, relevance: 0.45 },
  parts: { importance: 0.6, relevance: 0.55 },
  work: { importance: 0.7, relevance: 0.7 },
  payroll: { importance: 0.5, relevance: 0.5 },
  intake: { importance: 0.6, relevance: 0.6 },
};

/** Exact permission checks still come from `@autocore/rbac`; these are priors only. */
export function familyPrior(family: HomeMetricFamily, role: UserRole | null): FamilyPrior {
  switch (role) {
    case 'accountant':
      return ACCOUNTANT_PRIORS[family];
    case 'mechanic':
    case 'diagnostician':
      return FLOOR_PRIORS[family];
    case 'employee':
      return EMPLOYEE_PRIORS[family];
    default:
      return OPERATOR_PRIORS[family];
  }
}

/** ——— Score helpers ——— */

const EMPTY_SCORES: HomeMetricScores = {
  businessImportance: 0,
  urgency: 0,
  anomaly: 0,
  changeSignificance: 0,
  recency: 0,
  roleRelevance: 0,
  userPreference: 0,
  dataQuality: 0,
};

/**
 * Recency is bucketed to whole hours. Reopening Home five minutes later must not
 * reshuffle the brief (IA §5, determinism rule 2).
 */
export function recencyScore(lastEventAt: Date | null, now: Date): number {
  if (!lastEventAt) return 0;
  const hours = Math.floor((now.getTime() - lastEventAt.getTime()) / 3_600_000);
  if (!Number.isFinite(hours)) return 0;
  if (hours < 0) return 1;
  return round3(clamp01(1 - hours / 72));
}

/**
 * How far the latest complete bucket sits from the window's own history.
 *
 * Damped when there is nothing to measure against: activity appearing where
 * there was none is a change, but not a *measured* deviation, and scoring it as
 * though it were would let the first transaction of a quiet week outrank a shelf
 * that is actually running out.
 */
const NO_HISTORY_ANOMALY = 0.25;

export function anomalyScore(series: HomeSeriesPoint[] | null): number {
  if (!series || series.length < 4) return 0;
  // The final bucket is still in progress: at 9am today is always "below
  // average", and reading that as an anomaly would put a false alarm at the top
  // of every morning's Summary.
  const complete = series.slice(0, -1);
  if (complete.length < 3) return 0;
  const latest = complete[complete.length - 1].value;
  const history = complete.slice(0, -1).map((point) => point.value);
  const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
  if (mean <= 0) return latest > 0 ? NO_HISTORY_ANOMALY : 0;
  return round3(clamp01(Math.abs(latest - mean) / mean / 2));
}

export function changeSignificanceScore(comparison: HomeMetricComparison | null): number {
  if (!comparison || comparison.deltaPercent === null) return 0;
  return round3(clamp01(Math.abs(comparison.deltaPercent) / 60));
}

/**
 * A series earns its ink only when it carries signal.
 *
 * Variation is the whole test. A line that never moves says nothing a single
 * number does not already say, and drawing it anyway is the decorative chart the
 * design language rules out.
 */
export function seriesIsUseful(series: HomeSeriesPoint[] | null): boolean {
  if (!series || series.length < 4) return false;
  const values = series.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max <= 0) return false;
  return max !== min;
}

export function buildComparison(
  current: number,
  previous: number,
  label: string,
): HomeMetricComparison | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  // Nothing then, nothing now — there is no change to describe.
  if (current === 0 && previous === 0) return null;
  const ratio = relativeChange(previous, current);
  return {
    previousValue: previous,
    delta: current - previous,
    // null when the baseline was zero: a jump from nothing is not a percentage.
    deltaPercent: ratio === null ? null : round1(ratio * 100),
    label,
  };
}

/** ——— Candidate construction ——— */

type CandidateSpec = {
  id: HomeMetricId;
  family: HomeMetricFamily;
  title: string;
  unit: HomeMetricUnit;
  polarity: HomeMetricPolarity;
  periodLabel: string;
  destination: HomeMetric['destination'];
  value: number | null;
  comparison?: HomeMetricComparison | null;
  series?: HomeSeriesPoint[] | null;
  urgency?: number;
  lastEventAt?: Date | null;
  /** Permitted and loaded, but with nothing worth saying. */
  unavailableReason?: HomeMetricUnavailableReason | null;
  /** Source quality before the comparison bonus; 0 fails the ranking gate. */
  quality: number;
};

function toMetric(spec: CandidateSpec, role: UserRole | null, now: Date): HomeMetric {
  const prior = familyPrior(spec.family, role);
  const comparison = spec.comparison ?? null;
  const series = seriesIsUseful(spec.series ?? null) ? (spec.series ?? null) : null;
  const unavailable = spec.unavailableReason ?? (spec.value === null ? 'not_ready' : null);

  const scores: HomeMetricScores = unavailable
    ? { ...EMPTY_SCORES }
    : {
        businessImportance: round3(prior.importance),
        urgency: round3(clamp01(spec.urgency ?? 0.2)),
        anomaly: anomalyScore(series),
        changeSignificance: changeSignificanceScore(comparison),
        recency: recencyScore(spec.lastEventAt ?? null, now),
        roleRelevance: round3(prior.relevance),
        userPreference: 0,
        // A comparison only improves quality when it actually resolves to a
        // percentage — "we have a previous window but cannot divide by it" is
        // not better evidence than having no baseline at all.
        dataQuality: round3(
          clamp01(spec.quality + (comparison?.deltaPercent !== null && comparison ? 0.1 : 0)),
        ),
      };

  return {
    id: spec.id,
    family: spec.family,
    title: spec.title,
    value: spec.value,
    displayValue:
      spec.unit === 'count' && spec.value !== null ? COUNT_FORMAT.format(spec.value) : null,
    unit: spec.unit,
    periodLabel: spec.periodLabel,
    polarity: spec.polarity,
    comparison,
    trendSeries: series,
    // Written by the assembler once it knows which metric leads the Summary.
    note: null,
    scores,
    relevanceScore: 0,
    destination: spec.destination,
    unavailableReason: unavailable,
  };
}

/** Positions — cash in the drawer, stock on the shelf — are true "now", not window sums. */
const NOW_LABEL = 'Now';

const READY_QUALITY = 0.9;

/** A queue metric says nothing at zero; the absence is the message. */
function queueReason(
  gateReason: HomeMetricUnavailableReason | null,
  count: number,
): HomeMetricUnavailableReason | null {
  if (gateReason) return gateReason;
  return count === 0 ? 'insufficient_data' : null;
}

/**
 * A flow that never happened, with nothing to compare it against, is not a
 * metric — it is a quiet week.
 *
 * `Revenue · $0` set in display type reads as a broken screen. The Summary says
 * so in a sentence instead (`summaryNote`) and gives the space to stock and work
 * numbers that are still true. A zero *against* a non-zero previous window is
 * kept: that is a real and alarming drop.
 */
function flowReason(
  gateReason: HomeMetricUnavailableReason | null,
  value: number,
  comparison: HomeMetricComparison | null,
): HomeMetricUnavailableReason | null {
  if (gateReason) return gateReason;
  return value === 0 && comparison === null ? 'insufficient_data' : null;
}

/**
 * Every metric Home could show for this reader, scored but not yet ranked.
 *
 * The order of this array carries no meaning: `rankHomeMetrics` sorts by score
 * and breaks ties on `id`, so the brief is a function of the data alone.
 */
export function buildHomeMetricCandidates(
  input: HomeSourceInput,
  facts: HomeFacts = buildHomeFacts(input),
): HomeMetric[] {
  const { now, period, role } = input;
  const specs: CandidateSpec[] = [];

  /** ——— Money ——— */

  const { money, moneyReason } = facts;
  const moneyQuality = money ? READY_QUALITY : 0;

  specs.push({
    id: 'cash.balance',
    family: 'money',
    title: 'Cash on hand',
    unit: 'currency',
    polarity: 'higher_better',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('cash.balance'),
    value: money ? money.cashTotal : null,
    // A negative balance is the loudest thing a ledger can say.
    urgency: money && money.cashTotal < 0 ? 1 : 0.2,
    lastEventAt: money?.lastOperationAt ?? null,
    unavailableReason: moneyReason,
    quality: moneyQuality,
  });

  const revenueComparison = money
    ? buildComparison(money.totals.revenue, money.previousTotals.revenue, period.comparisonLabel)
    : null;
  const expenseComparison = money
    ? buildComparison(money.totals.expense, money.previousTotals.expense, period.comparisonLabel)
    : null;
  const netComparison = money
    ? buildComparison(money.totals.net, money.previousTotals.net, period.comparisonLabel)
    : null;

  specs.push({
    id: 'money.revenue',
    family: 'money',
    title: 'Revenue',
    unit: 'currency',
    polarity: 'higher_better',
    periodLabel: period.longLabel,
    destination: homeMetricDestination('money.revenue'),
    value: money ? money.totals.revenue : null,
    comparison: revenueComparison,
    series: money?.revenueSeries ?? null,
    urgency: 0.25,
    lastEventAt: money?.lastOperationAt ?? null,
    unavailableReason: money
      ? flowReason(moneyReason, money.totals.revenue, revenueComparison)
      : moneyReason,
    quality: moneyQuality,
  });

  specs.push({
    id: 'money.expense',
    family: 'money',
    title: 'Expenses',
    unit: 'currency',
    polarity: 'lower_better',
    periodLabel: period.longLabel,
    destination: homeMetricDestination('money.expense'),
    value: money ? money.totals.expense : null,
    comparison: expenseComparison,
    series: money?.expenseSeries ?? null,
    urgency: 0.2,
    lastEventAt: money?.lastOperationAt ?? null,
    unavailableReason: money
      ? flowReason(moneyReason, money.totals.expense, expenseComparison)
      : moneyReason,
    quality: moneyQuality,
  });

  specs.push({
    id: 'money.net',
    family: 'money',
    title: 'Net profit',
    unit: 'currency',
    polarity: 'higher_better',
    periodLabel: period.longLabel,
    destination: homeMetricDestination('money.net'),
    value: money ? money.totals.net : null,
    comparison: netComparison,
    series: money?.netSeries ?? null,
    urgency: money && money.totals.net < 0 ? 0.7 : 0.25,
    lastEventAt: money?.lastOperationAt ?? null,
    unavailableReason: money
      ? flowReason(moneyReason, money.totals.net, netComparison)
      : moneyReason,
    quality: moneyQuality,
  });

  /** ——— Orders ——— */

  const { orders, ordersReason } = facts;
  const ordersQuality = orders ? READY_QUALITY : 0;
  // Open work matters more once the day is ending and the floor is still full.
  const evening = now.getHours() >= 18;

  specs.push({
    id: 'orders.open',
    family: 'orders',
    title: 'Open orders',
    unit: 'count',
    polarity: 'neutral',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('orders.open'),
    value: orders ? orders.openCount : null,
    urgency: orders && orders.openCount > 0 && evening ? 0.7 : 0.3,
    lastEventAt: orders?.lastUpdatedAt ?? null,
    unavailableReason: ordersReason,
    quality: ordersQuality,
  });

  const newOrdersComparison = orders
    ? buildComparison(orders.newInPeriod, orders.newInPreviousPeriod, period.comparisonLabel)
    : null;

  specs.push({
    id: 'orders.new',
    family: 'orders',
    title: 'New orders',
    unit: 'count',
    polarity: 'higher_better',
    periodLabel: period.longLabel,
    destination: homeMetricDestination('orders.new'),
    value: orders ? orders.newInPeriod : null,
    comparison: newOrdersComparison,
    series: orders?.newPerBucket ?? null,
    urgency: 0.25,
    lastEventAt: orders?.lastUpdatedAt ?? null,
    unavailableReason: orders
      ? flowReason(ordersReason, orders.newInPeriod, newOrdersComparison)
      : ordersReason,
    quality: ordersQuality,
  });

  specs.push({
    id: 'work.assigned_open',
    family: 'work',
    title: 'My open jobs',
    unit: 'count',
    polarity: 'neutral',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('work.assigned_open'),
    value: orders ? orders.assignedOpenCount : null,
    urgency: orders && orders.assignedOpenCount > 0 && evening ? 0.8 : 0.55,
    lastEventAt: orders?.lastUpdatedAt ?? null,
    unavailableReason: queueReason(ordersReason, orders?.assignedOpenCount ?? 0),
    quality: ordersQuality,
  });

  /** ——— Engines ——— */

  const { engines, enginesReason } = facts;
  const enginesQuality = engines ? READY_QUALITY : 0;

  specs.push({
    id: 'engines.available',
    family: 'engines',
    title: 'Engines in stock',
    unit: 'count',
    polarity: 'neutral',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('engines.available'),
    value: engines ? engines.availableCount : null,
    urgency: 0.2,
    lastEventAt: engines?.lastUpdatedAt ?? null,
    unavailableReason: enginesReason,
    quality: enginesQuality,
  });

  specs.push({
    id: 'engines.aging',
    family: 'engines',
    title: 'Engines idle 90+ days',
    unit: 'count',
    polarity: 'lower_better',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('engines.aging'),
    value: engines ? engines.agingCount : null,
    urgency: engines && engines.agingCount > 0 ? round3(clamp01(0.45 + engines.agingCount / 25)) : 0,
    lastEventAt: engines?.lastUpdatedAt ?? null,
    unavailableReason: queueReason(enginesReason, engines?.agingCount ?? 0),
    quality: enginesQuality,
  });

  /** ——— Parts ——— */

  const { parts, partsReason } = facts;
  const partsQuality = parts ? READY_QUALITY : 0;

  specs.push({
    id: 'parts.available',
    family: 'parts',
    title: 'Parts available',
    unit: 'count',
    polarity: 'neutral',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('parts.available'),
    value: parts ? parts.availableCount : null,
    urgency: 0.2,
    lastEventAt: parts?.lastUpdatedAt ?? null,
    unavailableReason: partsReason,
    quality: partsQuality,
  });

  specs.push({
    id: 'parts.low_stock',
    family: 'parts',
    title: 'Parts below reorder level',
    unit: 'count',
    polarity: 'lower_better',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('parts.low_stock'),
    value: parts ? parts.lowStockCount : null,
    urgency: parts && parts.lowStockCount > 0 ? round3(clamp01(0.55 + parts.lowStockCount / 20)) : 0,
    lastEventAt: parts?.lastUpdatedAt ?? null,
    unavailableReason: queueReason(partsReason, parts?.lowStockCount ?? 0),
    quality: partsQuality,
  });

  /** ——— Intake ——— */

  const { intake, intakeReason } = facts;

  specs.push({
    id: 'intake.in_progress',
    family: 'intake',
    title: 'Engines in intake',
    unit: 'count',
    polarity: 'neutral',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('intake.in_progress'),
    value: intake ? intake.inProgressCount : null,
    urgency: intake && intake.inProgressCount > 0 ? 0.6 : 0,
    lastEventAt: null,
    unavailableReason: queueReason(intakeReason, intake?.inProgressCount ?? 0),
    quality: intake ? 0.85 : 0,
  });

  /** ——— Earnings ——— */

  const { earnings, earningsReason } = facts;

  specs.push({
    id: 'earnings.claimable',
    family: 'payroll',
    title: 'Jobs ready to claim',
    unit: 'count',
    polarity: 'neutral',
    periodLabel: NOW_LABEL,
    destination: homeMetricDestination('earnings.claimable'),
    value: earnings ? earnings.claimableCount : null,
    urgency: earnings && earnings.claimableCount > 0 ? 0.7 : 0,
    lastEventAt: orders?.lastUpdatedAt ?? null,
    unavailableReason: queueReason(earningsReason, earnings?.claimableCount ?? 0),
    quality: earnings ? READY_QUALITY : 0,
  });

  return specs.map((spec) => toMetric(spec, role, now));
}
