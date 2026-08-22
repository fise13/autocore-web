/**
 * Home = Dynamic Business Summary.
 *
 * The contract in `docs/home-information-architecture.md` §4/§7/§8/§15, typed.
 * Nothing here is a screen concern: the view model is assembled from live
 * catalogs, ranked deterministically, and only then handed to UI.
 *
 * Two rules the types enforce on purpose:
 *   - `value: number | null` — `null` means "not known yet". A count is never
 *     rendered as `0` because a listener has not delivered its first snapshot.
 *   - `unavailableReason` — a candidate that cannot be shown says why instead of
 *     silently disappearing into a fake zero.
 */
import type { UserRole } from '@autocore/rbac';
import type { DataScope } from '@autocore/rbac';

/** Existing routes only. Anything not routable today is simply not emitted. */
export type HomeDestination = {
  pathname: string;
  params?: Record<string, string>;
};

/** ——— Period ——— */

/** Home windows mirror Finance so a drill-down opens on a comparable range. */
export type HomePeriodId = '7d' | '30d' | '3m';

export type HomeBucket = {
  start: Date;
  /** Exclusive */
  end: Date;
  label: string;
};

export type HomePeriod = {
  id: HomePeriodId;
  /** Segmented control label — "7D" */
  label: string;
  /** User-facing window label — "Last 7 days" */
  longLabel: string;
  /** "vs previous 7 days" */
  comparisonLabel: string;
  start: Date;
  /** Exclusive */
  end: Date;
  buckets: HomeBucket[];
};

/** ——— Metric ——— */

export type HomeMetricFamily =
  | 'money'
  | 'orders'
  | 'engines'
  | 'parts'
  | 'work'
  | 'payroll'
  | 'intake';

export type HomeMetricUnit = 'currency' | 'count';

export type HomeMetricId =
  | 'cash.balance'
  | 'money.revenue'
  | 'money.expense'
  | 'money.net'
  | 'orders.open'
  | 'orders.new'
  | 'work.assigned_open'
  | 'engines.available'
  | 'engines.aging'
  | 'parts.available'
  | 'parts.low_stock'
  | 'intake.in_progress'
  | 'earnings.claimable';

/**
 * Which direction is good. Without it a rising expense would render in the same
 * green as rising revenue, which is a lie told in colour.
 */
export type HomeMetricPolarity = 'higher_better' | 'lower_better' | 'neutral';

export type HomeMetricComparison = {
  previousValue: number;
  delta: number;
  /** null when the previous window holds nothing to divide by */
  deltaPercent: number | null;
  /** "vs previous 7 days" */
  label: string;
};

export type HomeSeriesPoint = {
  label: string;
  value: number;
};

/** Ranking inputs. Never rendered — the reader sees the order, not the maths. */
export type HomeMetricScores = {
  businessImportance: number;
  urgency: number;
  anomaly: number;
  changeSignificance: number;
  recency: number;
  roleRelevance: number;
  userPreference: number;
  dataQuality: number;
};

export type HomeMetricUnavailableReason =
  | 'no_permission'
  | 'module_off'
  | 'not_ready'
  | 'insufficient_data';

export type HomeMetric = {
  id: HomeMetricId;
  family: HomeMetricFamily;
  title: string;
  /** null = unknown. Never a placeholder zero. */
  value: number | null;
  /**
   * Pre-formatted display string for units that format purely. Currency is
   * deliberately left null: it depends on the company display currency and the
   * live exchange rates, so the screen formats it.
   */
  displayValue: string | null;
  unit: HomeMetricUnit;
  /** "Last 7 days" for flows, "Now" for positions (cash, on-hand counts). */
  periodLabel: string;
  polarity: HomeMetricPolarity;
  comparison: HomeMetricComparison | null;
  /** Quiet spark series for the same window — omitted when it carries no signal. */
  trendSeries: HomeSeriesPoint[] | null;
  /**
   * One contextual sentence for when this metric leads the Summary.
   *
   * Filled by the assembler, not the metric builder: it is the line an Attention
   * item would otherwise have repeated underneath, or the plain reading of the
   * comparison. Compact rows never show it.
   */
  note: string | null;
  scores: HomeMetricScores;
  /** Deterministic aggregate of `scores` — the single sort key. */
  relevanceScore: number;
  destination: HomeDestination | null;
  unavailableReason: HomeMetricUnavailableReason | null;
};

/** ——— Trend ——— */

export type HomeTrendDirection = 'up' | 'down' | 'flat' | 'unknown';

/** `none` is a shape with no baseline behind it — a picture, not a claim. */
export type HomeTrendSignificance = 'none' | 'mild' | 'notable' | 'severe';

export type HomeTrend = {
  id: string;
  metricId: HomeMetricId;
  title: string;
  /** Carried from the metric so the chart can format what a scrub lands on. */
  unit: HomeMetricUnit;
  explanation: string;
  direction: HomeTrendDirection;
  /**
   * Signed, already rounded by the metric comparison. `null` when the previous
   * window held nothing to divide by — the card then shows the shape and says
   * plainly that there is nothing to compare it against.
   */
  deltaPercent: number | null;
  significance: HomeTrendSignificance;
  /** Whether this movement is good for the business, given metric polarity. */
  tone: 'positive' | 'negative' | 'neutral';
  comparisonLabel: string;
  series: HomeSeriesPoint[] | null;
  /** What the legend prints and what the chart's reference line sits at. */
  values: {
    current: number;
    previous: number | null;
    /**
     * The previous window's average per bucket. Drawn as the quiet reference
     * line the current series is read against — the same job Health's grey
     * long-run average line does.
     */
    baseline: number | null;
  };
  destination: HomeDestination | null;
};

/** ——— Attention ——— */

export type HomeAttentionSeverity = 'blocking' | 'warning' | 'informational';

export type HomeAttentionId =
  | 'intake.quarantine'
  | 'intake.rework'
  | 'intake.awaiting_verification'
  | 'orders.waiting_parts'
  | 'parts.low_stock'
  | 'engines.aging'
  | 'earnings.claimable'
  | 'payroll.pending';

export type HomeAttentionItem = {
  id: HomeAttentionId;
  severity: HomeAttentionSeverity;
  title: string;
  explanation: string;
  count: number;
  /** Primary verb — what tapping the row lets the reader do. */
  action: string;
  /** Sort input inside a severity band. Rounded, so order never flickers. */
  urgency: number;
  destination: HomeDestination;
  dismissible: boolean;
};

/** ——— Quick actions ——— */

export type HomeQuickAction = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

/** ——— Activity ——— */

export type HomeActivityCategory = 'order';

export type HomeActivityRow = {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  statusLabel: string;
  statusTone: 'default' | 'warning' | 'success' | 'muted';
  category: HomeActivityCategory;
  destination: HomeDestination;
};

/** ——— Permissions / modules ——— */

export type HomePermissions = {
  canViewMoney: boolean;
  canViewOrders: boolean;
  canViewInventory: boolean;
  canViewMotors: boolean;
  canViewIntake: boolean;
  canViewEarnings: boolean;
  canCustomize: boolean;
  ordersScope: DataScope;
};

export type HomeModules = {
  accounting: boolean;
  workOrders: boolean;
  warehouse: boolean;
  motors: boolean;
};

/** ——— Personalization ——— */

export type HomePreferences = {
  /** Force-included ahead of the ranking, up to `HOME_MAX_PINNED`. */
  pinned: HomeMetricId[];
  hidden: HomeMetricId[];
};

/** ——— Source snapshot ——— */

/** Minimal intake shape Home reads — keeps the metric maths free of the package. */
export type HomeIntakeJob = {
  id: string;
  state: string;
};

export type HomeDataQuality = 'ok' | 'partial' | 'stale' | 'error';

/** ——— View model ——— */

export type HomeViewModel = {
  meta: {
    companyId: string | null;
    generatedAt: Date;
    offline: boolean;
    dataQualityOverall: HomeDataQuality;
    /**
     * The window Summary flows are measured over. Fixed, and named on every row
     * that uses it — Home does not hand the reader a global range control for a
     * brief whose metrics have different natural periods.
     */
    summaryPeriod: HomePeriod;
    /** The analytical window, chosen by the reader inside the Trends section. */
    trendPeriod: HomePeriod;
    /** False until every permitted listener has delivered a first snapshot. */
    ready: boolean;
    /**
     * True while the screen is showing the brief saved on this device from an
     * earlier session, because the live one has not finished loading.
     */
    fromCache: boolean;
    /** When the shown brief was last measured against live data. */
    lastSyncedAt: number | null;
  };
  context: {
    organizationName: string;
    /** null until multi-site is productized — Home renders no fake locus. */
    locationLabel: string | null;
    /** "Thursday, 20 August" — orientation, not a control. */
    dateLabel: string;
    offlineBanner: string | null;
  };
  /** Ranked, 0–4. Index 0 leads the section; no mandatory hero slot. */
  summary: HomeMetric[];
  /**
   * Said instead of a headline zero when the business was simply quiet — a
   * `$0` in display type reads as a broken app rather than a calm week.
   */
  summaryNote: string | null;
  /** 0–2 narratives about change, measured over `meta.trendPeriod`. */
  trends: HomeTrend[];
  /**
   * Whether anything in this company can be compared against a previous window
   * at all. False hides the section outright — a range control above the words
   * "no change" is a control over nothing.
   */
  trendsAvailable: boolean;
  /** Severity-sorted. Empty means the section is omitted. */
  attention: HomeAttentionItem[];
  quickActions: HomeQuickAction[];
  activity: HomeActivityRow[];
  permissions: HomePermissions;
  role: UserRole | null;
};
