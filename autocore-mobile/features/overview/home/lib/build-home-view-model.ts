/**
 * The Home assembler (IA §15).
 *
 * Sources in, one ranked brief out. Everything above this file is pure data
 * derivation; everything below it is presentation. Keeping the assembly pure is
 * what makes the ranking testable against role and scenario fixtures instead of
 * against a rendered screen.
 *
 * Two windows meet here. Summary flows are measured over one fixed week and
 * every row names it, because cash and stock are positions and revenue is a
 * flow — one global range control would have to misdescribe one of them. Trends
 * carry their own reader-chosen window, and the section that owns the control is
 * the section the control governs.
 */
import type { ActionItem } from '@/lib/shell/types';
import type { UserRole } from '@autocore/rbac';

import { resolveGreetingMeta } from '../../utils/greeting';
import type {
  HomeAttentionId,
  HomeAttentionItem,
  HomeDataQuality,
  HomeMetric,
  HomeMetricId,
  HomePeriod,
  HomePreferences,
  HomeViewModel,
} from '../types';
import { buildHomeActivity } from './activity';
import { buildHomeAttention } from './attention';
import { buildHomeFacts, type HomeFacts, type HomeSourceInput } from './facts';
import { buildHomeMetricCandidates } from './metrics';
import type { HomeMoneySnapshot } from './money';
import { buildHomeQuickActions } from './quick-actions';
import { EMPTY_HOME_PREFERENCES, HOME_MAX_SUMMARY_METRICS, rankHomeMetrics } from './ranking';
import { buildHomeTrends, hasTrendMaterial } from './trends';

/** The analytical window, when the reader has widened it past the Summary week. */
export type HomeTrendWindowInput = {
  period: HomePeriod;
  previousPeriod: { start: Date; end: Date };
  money?: HomeMoneySnapshot;
};

export type BuildHomeViewModelInput = HomeSourceInput & {
  companyId: string | null;
  organizationName: string;
  offline: boolean;
  actions: ActionItem[];
  preferences?: HomePreferences;
  maxSummaryMetrics?: number;
  /** Omit to measure trends over the same window as the Summary. */
  trendWindow?: HomeTrendWindowInput;
};

type DomainGate = { reason: string | null; permitted: boolean };

function domainGates(facts: HomeFacts): DomainGate[] {
  return [
    { reason: facts.ordersReason, permitted: facts.ordersReason !== 'no_permission' },
    { reason: facts.moneyReason, permitted: facts.moneyReason !== 'no_permission' },
    { reason: facts.enginesReason, permitted: facts.enginesReason !== 'no_permission' },
    { reason: facts.partsReason, permitted: facts.partsReason !== 'no_permission' },
    { reason: facts.intakeReason, permitted: facts.intakeReason !== 'no_permission' },
    { reason: facts.earningsReason, permitted: facts.earningsReason !== 'no_permission' },
  ];
}

/**
 * A domain the reader is not entitled to, or a module that is switched off, is
 * not a data problem — only a listener that has not delivered is.
 */
export function homeSourcesReady(facts: HomeFacts): boolean {
  return domainGates(facts).every((gate) => gate.reason !== 'not_ready');
}

export function resolveHomeDataQuality(facts: HomeFacts, offline: boolean): HomeDataQuality {
  if (offline) return 'stale';
  return homeSourcesReady(facts) ? 'ok' : 'partial';
}

/**
 * Attention items that restate a Summary metric.
 *
 * When one of these leads the Summary, the hero already carries the number and
 * the explanation, and repeating it four rows later is the screen talking to
 * itself. The attention row is dropped and its sentence moves up to the hero,
 * so the reader loses nothing and reads it once.
 */
const ATTENTION_RESTATES_METRIC: Partial<Record<HomeAttentionId, HomeMetricId>> = {
  'parts.low_stock': 'parts.low_stock',
  'engines.aging': 'engines.aging',
  'earnings.claimable': 'earnings.claimable',
};

function windowNoun(comparisonLabel: string): string {
  return comparisonLabel.replace(/^vs previous /i, '');
}

/** Plain reading of a comparison — no adjectives the data has not earned. */
function comparisonNote(metric: HomeMetric): string | null {
  const percent = metric.comparison?.deltaPercent;
  if (percent === null || percent === undefined || percent === 0) return null;
  const magnitude = Math.abs(percent);
  const rounded = magnitude % 1 === 0 ? magnitude.toFixed(0) : magnitude.toFixed(1);
  const noun = windowNoun(metric.comparison?.label ?? '');
  if (!noun) return null;
  return `${percent > 0 ? 'Up' : 'Down'} ${rounded}% from the previous ${noun}.`;
}

function lowerFirst(value: string): string {
  return value.length > 0 ? value[0].toLowerCase() + value.slice(1) : value;
}

/**
 * Display type is reserved for a number that says something.
 *
 * A zero is a legitimate reading — "nothing is open right now" is worth knowing —
 * but set at 34pt as the one thing the screen leads with, it reads as a broken
 * app rather than a calm one. So when anything else in the brief carries a
 * value, that leads and the zero keeps its compact row. Relative order is
 * otherwise untouched: this promotes, it does not re-rank.
 */
function leadWithSomethingToSay(metrics: HomeMetric[]): HomeMetric[] {
  const leadIndex = metrics.findIndex((metric) => metric.value !== 0);
  if (leadIndex <= 0) return metrics;
  return [metrics[leadIndex], ...metrics.filter((_, index) => index !== leadIndex)];
}

export function buildHomeViewModel(input: BuildHomeViewModelInput): HomeViewModel {
  const facts = buildHomeFacts(input);
  const preferences = input.preferences ?? EMPTY_HOME_PREFERENCES;

  const candidates: HomeMetric[] = buildHomeMetricCandidates(input, facts);
  const ranked = rankHomeMetrics(
    candidates,
    preferences,
    input.maxSummaryMetrics ?? HOME_MAX_SUMMARY_METRICS,
  );

  // Personalization can reorder and hide metrics; it can never mute a warning.
  const allAttention: HomeAttentionItem[] = buildHomeAttention(facts);

  const ordered = leadWithSomethingToSay(ranked.summary);
  const featured = ordered[0] ?? null;
  const restated = featured
    ? (allAttention.find((item) => ATTENTION_RESTATES_METRIC[item.id] === featured.id) ?? null)
    : null;

  const attention = restated
    ? allAttention.filter((item) => item.id !== restated.id)
    : allAttention;

  const summary = ordered.map((metric, index) =>
    index === 0
      ? { ...metric, note: restated?.explanation ?? comparisonNote(metric) }
      : metric,
  );

  /**
   * Trends read from their own window when the reader has widened it. Same
   * window means the same pool, so the second pass is skipped rather than
   * recomputing an identical answer.
   */
  const trendWindow = input.trendWindow;
  const sameWindow = !trendWindow || trendWindow.period.id === input.period.id;
  const trendPool = sameWindow
    ? ranked.eligible
    : rankHomeMetrics(
        buildHomeMetricCandidates({
          ...input,
          period: trendWindow.period,
          previousPeriod: trendWindow.previousPeriod,
          money: trendWindow.money,
        }),
        preferences,
        0,
      ).eligible;

  const trendPeriodLabel = (trendWindow?.period ?? input.period).longLabel;
  const trends = buildHomeTrends(trendPool, trendPeriodLabel);
  // A range control above the words "no change" is a control over nothing.
  const trendsAvailable = hasTrendMaterial(trendPool);

  const quickActions = buildHomeQuickActions({
    actions: input.actions,
    hasOpenIntake: (facts.intake?.inProgressCount ?? 0) > 0,
  });
  const activity = buildHomeActivity(facts.orders ? input.orders : null, input.now);

  // A quiet week is said in a sentence. A headline `$0` reads as a broken app.
  const summaryNote =
    facts.money && facts.money.totals.revenue === 0
      ? `No sales recorded in the ${lowerFirst(input.period.longLabel)}.`
      : null;

  const ready = homeSourcesReady(facts);

  return {
    meta: {
      companyId: input.companyId,
      generatedAt: input.now,
      offline: input.offline,
      dataQualityOverall: resolveHomeDataQuality(facts, input.offline),
      summaryPeriod: input.period,
      trendPeriod: trendWindow?.period ?? input.period,
      ready,
      // This assembler only ever describes live sources. Restoring a saved brief
      // is the caller's job, and it stamps these itself.
      fromCache: false,
      lastSyncedAt: ready ? input.now.getTime() : null,
    },
    context: {
      organizationName: input.organizationName,
      // Multi-site is not productized yet — Home renders no fake locus.
      locationLabel: null,
      dateLabel: resolveGreetingMeta(null, input.now),
      // Connectivity is owned by OfflineSessionBanner (auth gate) — avoid a
      // second Offline chip competing with the company title on Home.
      offlineBanner: null,
    },
    summary,
    summaryNote,
    trends,
    trendsAvailable,
    attention,
    quickActions,
    activity,
    permissions: input.permissions,
    role: (input.role ?? null) as UserRole | null,
  };
}
