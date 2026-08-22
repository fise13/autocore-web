/**
 * The last brief Home showed, kept on the device.
 *
 * Home used to open empty and fill in: counts blank for a beat, charts blank for
 * longer, because the heavy catalogs are deliberately delayed off the first
 * frame. That reads as a broken screen every single launch.
 *
 * The obvious fix — persist the catalogs — is the wrong one here. The realtime
 * snapshot cache already skips financial operations by design ("grow without
 * bound and the worst stringify offenders") and drops anything over 750k chars,
 * which is most of a real inventory. Undoing either would trade a blank screen
 * for a janky one.
 *
 * So what is stored is the *answer*, not the ingredients: the assembled view
 * model is a handful of metrics, at most two trends, a few dozen short strings
 * and two small series — kilobytes. It reads synchronously on the first frame,
 * covers every section including the charts, and needs no listener to be ready.
 *
 * Two rules keep it honest:
 *   - a restored brief is always labelled as last-synced, never passed off as now;
 *   - permissions come from the live session, so a cached metric cannot outlive
 *     the reader's right to see it.
 */
import type {
  HomeMetric,
  HomeMetricFamily,
  HomePeriod,
  HomePeriodId,
  HomePermissions,
  HomeTrend,
  HomeViewModel,
} from '../types';

export const HOME_BRIEF_PREFIX = 'autocore-mobile:home-brief:';
/**
 * Schema version. Bump on any shape change so an old brief is ignored rather
 * than rendered through new code that expects fields it does not have.
 */
export const HOME_BRIEF_VERSION = 1;
/** Matches the realtime snapshot cache, so the two age out together. */
export const HOME_BRIEF_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
/** Enough for a few companies across the three ranges; expired keys go first. */
export const HOME_BRIEF_MAX_ENTRIES = 12;

type PersistedPeriod = {
  id: HomePeriodId;
  label: string;
  longLabel: string;
  comparisonLabel: string;
  start: number;
  end: number;
  buckets: Array<{ start: number; end: number; label: string }>;
};

export type PersistedHomeModel = Omit<HomeViewModel, 'meta'> & {
  meta: Omit<HomeViewModel['meta'], 'generatedAt' | 'summaryPeriod' | 'trendPeriod'> & {
    generatedAt: number;
    summaryPeriod: PersistedPeriod;
    trendPeriod: PersistedPeriod;
  };
};

export type HomeBriefEnvelope = {
  version: number;
  companyId: string;
  uid: string | null;
  savedAt: number;
  model: PersistedHomeModel;
};

export type RestoredHomeBrief = {
  model: HomeViewModel;
  savedAt: number;
};

/**
 * The brief is keyed by the range it was built for.
 *
 * Trends only ever hold one window, so a brief captured on "7 days" cannot
 * answer for "3 months". Keying by range means switching to a range the reader
 * has used before still opens with content.
 */
export function homeBriefKey(companyId: string, uid: string | null, period: HomePeriodId): string {
  return `${HOME_BRIEF_PREFIX}${companyId}:${uid ?? 'anon'}:${period}`;
}

function toPersistedPeriod(period: HomePeriod): PersistedPeriod {
  return {
    id: period.id,
    label: period.label,
    longLabel: period.longLabel,
    comparisonLabel: period.comparisonLabel,
    start: period.start.getTime(),
    end: period.end.getTime(),
    buckets: period.buckets.map((bucket) => ({
      start: bucket.start.getTime(),
      end: bucket.end.getTime(),
      label: bucket.label,
    })),
  };
}

function fromPersistedPeriod(period: PersistedPeriod): HomePeriod {
  return {
    id: period.id,
    label: period.label,
    longLabel: period.longLabel,
    comparisonLabel: period.comparisonLabel,
    start: new Date(period.start),
    end: new Date(period.end),
    buckets: period.buckets.map((bucket) => ({
      start: new Date(bucket.start),
      end: new Date(bucket.end),
      label: bucket.label,
    })),
  };
}

/**
 * Dates are stored as epoch numbers rather than round-tripped through a generic
 * date reviver: the model also carries human strings like "5 Jul, 15:22", and a
 * reviver clever enough to catch those would be clever enough to corrupt them.
 */
export function serializeHomeViewModel(model: HomeViewModel): PersistedHomeModel {
  return {
    ...model,
    meta: {
      ...model.meta,
      generatedAt: model.meta.generatedAt.getTime(),
      summaryPeriod: toPersistedPeriod(model.meta.summaryPeriod),
      trendPeriod: toPersistedPeriod(model.meta.trendPeriod),
    },
  };
}

export function deserializeHomeViewModel(model: PersistedHomeModel): HomeViewModel {
  return {
    ...model,
    meta: {
      ...model.meta,
      generatedAt: new Date(model.meta.generatedAt),
      summaryPeriod: fromPersistedPeriod(model.meta.summaryPeriod),
      trendPeriod: fromPersistedPeriod(model.meta.trendPeriod),
    },
  };
}

/**
 * Whether a model is worth keeping.
 *
 * Only a fully-loaded, live one qualifies. Persisting a partial model would save
 * the very blank screen this exists to prevent, and persisting a restored one
 * would let a brief copy itself forward and never expire.
 */
export function shouldPersistHomeBrief(model: HomeViewModel): boolean {
  return model.meta.ready && !model.meta.fromCache;
}

/** ——— Restoring ——— */

const FAMILY_PERMISSION: Record<HomeMetricFamily, keyof HomePermissions> = {
  money: 'canViewMoney',
  orders: 'canViewOrders',
  work: 'canViewOrders',
  engines: 'canViewMotors',
  parts: 'canViewInventory',
  intake: 'canViewIntake',
  payroll: 'canViewEarnings',
};

function permits(permissions: HomePermissions, family: HomeMetricFamily): boolean {
  return permissions[FAMILY_PERMISSION[family]] === true;
}

function metricFamilyOf(trend: HomeTrend, summary: HomeMetric[]): HomeMetricFamily | null {
  return summary.find((metric) => metric.id === trend.metricId)?.family ?? null;
}

/**
 * Show yesterday's answer while today's is still loading.
 *
 * The restored brief supplies the content; the live model supplies everything
 * about *now* — which company, which day, whether the device is online, and what
 * this reader is allowed to see. That split is the whole safety story: a role
 * change or a sign-out cannot be undone by something sitting in storage.
 */
export function restoreHomeFromCache(
  live: HomeViewModel,
  cached: RestoredHomeBrief,
): HomeViewModel {
  const permissions = live.permissions;

  const summary = cached.model.summary.filter((metric) => permits(permissions, metric.family));
  const trends = cached.model.trends.filter((trend) => {
    const family = metricFamilyOf(trend, cached.model.summary);
    // A trend whose metric is no longer in the brief cannot be permission-checked,
    // so it is dropped rather than guessed at.
    return family !== null && permits(permissions, family);
  });
  const attention = permissions.canViewOrders || permissions.canViewInventory
    ? cached.model.attention
    : [];
  const activity = permissions.canViewOrders ? cached.model.activity : [];

  return {
    ...cached.model,
    meta: {
      ...live.meta,
      dataQualityOverall: 'stale',
      fromCache: true,
      lastSyncedAt: cached.savedAt,
      // The restored brief was measured over its own windows, and those are the
      // ones its numbers and axes describe.
      summaryPeriod: cached.model.meta.summaryPeriod,
      trendPeriod: cached.model.meta.trendPeriod,
    },
    context: live.context,
    summary,
    trends,
    attention,
    activity,
    // Actions are resolved from the live shell, never restored — a shortcut into
    // a flow the reader can no longer start is worse than one fewer shortcut.
    quickActions: live.quickActions,
    permissions,
    role: live.role,
  };
}
