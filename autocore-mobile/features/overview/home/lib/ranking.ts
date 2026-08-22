/**
 * Deterministic relevance ranking for the Home Summary (IA §5).
 *
 * The contract this file has to keep is narrow but strict: the same snapshot of
 * data must produce the same order, every time. That means no clocks beyond the
 * bucketed inputs the metric builders already rounded, no randomisation, and a
 * total order — score descending, then `id` ascending — so ties cannot flicker.
 *
 * The ranker never invents a metric and never rescues one: a candidate below the
 * data-quality gate is dropped rather than shown last with a hopeful zero.
 */
import type {
  HomeMetric,
  HomeMetricFamily,
  HomeMetricId,
  HomeMetricScores,
  HomePreferences,
} from '../types';

/**
 * "Act now" beats "interesting": urgency and anomaly carry the most weight, role
 * and module priors set the baseline, and change explains the rest. Data quality
 * contributes softly on top of the hard `HOME_MIN_DATA_QUALITY` gate.
 */
export const HOME_RANKING_WEIGHTS: Record<keyof HomeMetricScores, number> = {
  urgency: 0.26,
  anomaly: 0.22,
  businessImportance: 0.16,
  roleRelevance: 0.14,
  changeSignificance: 0.1,
  dataQuality: 0.06,
  userPreference: 0.04,
  recency: 0.02,
};

export const HOME_MIN_DATA_QUALITY = 0.5;

/** Linear density: a brief, not a wall. */
export const HOME_MAX_SUMMARY_METRICS = 4;

/** Pins are strong, but they cannot take the whole Summary hostage. */
export const HOME_MAX_PINNED = 2;

/**
 * How many metrics one family may contribute.
 *
 * Money metrics move together — a good week lifts revenue, net and margin at
 * once — so pure score ordering can fill the whole Summary with four views of
 * the ledger. Home summarises the business; Finance owns the money narrative.
 * Two per family keeps a strong signal loud without turning Home into an
 * excerpt of another tab. A pin is an explicit choice and bypasses the cap.
 */
export const HOME_MAX_PER_FAMILY = 2;

export const EMPTY_HOME_PREFERENCES: HomePreferences = { pinned: [], hidden: [] };

export function scoreHomeMetric(scores: HomeMetricScores): number {
  let total = 0;
  for (const key of Object.keys(HOME_RANKING_WEIGHTS) as Array<keyof HomeMetricScores>) {
    total += HOME_RANKING_WEIGHTS[key] * (scores[key] ?? 0);
  }
  return Math.round(total * 10_000) / 10_000;
}

function byScoreThenId(left: HomeMetric, right: HomeMetric): number {
  if (right.relevanceScore !== left.relevanceScore) {
    return right.relevanceScore - left.relevanceScore;
  }
  return left.id.localeCompare(right.id);
}

export type RankedHomeMetrics = {
  /** Top K, ranked. */
  summary: HomeMetric[];
  /** Everything that cleared the gates, ranked — Trends reads from here. */
  eligible: HomeMetric[];
};

/**
 * Apply preferences and the quality gate, then order.
 *
 * Priority stack (IA §12): permission and data quality come before preference,
 * and preference never touches the Attention section — that is why hiding a
 * metric here cannot silence a warning.
 */
export function rankHomeMetrics(
  candidates: HomeMetric[],
  preferences: HomePreferences = EMPTY_HOME_PREFERENCES,
  maxMetrics = HOME_MAX_SUMMARY_METRICS,
  maxPerFamily = HOME_MAX_PER_FAMILY,
): RankedHomeMetrics {
  const hidden = new Set<HomeMetricId>(preferences.hidden);
  const pinnedOrder = preferences.pinned.slice(0, HOME_MAX_PINNED);
  const pinned = new Set<HomeMetricId>(pinnedOrder);

  const eligible = candidates
    .filter((metric) => metric.unavailableReason === null)
    .filter((metric) => metric.value !== null)
    .filter((metric) => !hidden.has(metric.id))
    .filter((metric) => metric.scores.dataQuality >= HOME_MIN_DATA_QUALITY)
    .map((metric) => {
      const scores: HomeMetricScores = {
        ...metric.scores,
        userPreference: pinned.has(metric.id) ? 1 : 0,
      };
      return { ...metric, scores, relevanceScore: scoreHomeMetric(scores) };
    })
    .sort(byScoreThenId);

  if (maxMetrics <= 0) return { summary: [], eligible };

  const byId = new Map(eligible.map((metric) => [metric.id, metric] as const));
  const summary: HomeMetric[] = [];
  const taken = new Set<HomeMetricId>();
  const familyCount = new Map<HomeMetricFamily, number>();

  const take = (metric: HomeMetric) => {
    summary.push(metric);
    taken.add(metric.id);
    familyCount.set(metric.family, (familyCount.get(metric.family) ?? 0) + 1);
  };

  for (const id of pinnedOrder) {
    const metric = byId.get(id);
    if (!metric || taken.has(id)) continue;
    take(metric);
    if (summary.length >= maxMetrics) break;
  }

  // Two passes: fill within the family cap first, then — only if the Summary is
  // still short — relax it rather than leave the brief emptier than it needs to
  // be. A company running a single module should still get a full summary.
  for (const metric of eligible) {
    if (summary.length >= maxMetrics) break;
    if (taken.has(metric.id)) continue;
    if ((familyCount.get(metric.family) ?? 0) >= maxPerFamily) continue;
    take(metric);
  }

  for (const metric of eligible) {
    if (summary.length >= maxMetrics) break;
    if (taken.has(metric.id)) continue;
    take(metric);
  }

  return { summary, eligible };
}
