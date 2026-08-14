import type { ComponentType } from 'react';

export type ActivityCategory = 'inventory' | 'sale' | 'order' | 'warranty' | 'reservation';

export type OverviewAttentionItem = {
  count: number;
  text: string;
  tone: 'warning' | 'danger';
  route?: '/orders' | '/search' | '/warehouse' | '/(tabs)/accounting' | '/earnings';
  routeParams?: Record<string, string>;
};

export type OverviewAttention = {
  title: string;
  items: OverviewAttentionItem[];
};

export type TodayStatFormat = 'integer' | 'currency-rub' | 'grouped';

export type StatEmphasis = 'hero' | 'default' | 'quiet';

export type OverviewTodayStat = {
  id: string;
  label: string;
  value: number;
  format: TodayStatFormat;
  emphasis?: StatEmphasis;
  tone?: 'default' | 'warning' | 'success';
  route?: '/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type KpiTone = 'primary' | 'success' | 'warning' | 'muted';

/** @deprecated Merged into `today` — kept for mock snapshots */
export type OverviewKpi = {
  id: string;
  label: string;
  value: number;
  format: TodayStatFormat | 'grouped';
  hint?: string;
  tone: KpiTone;
  route?: '/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type InsightTone = 'neutral' | 'positive' | 'warning';

/** Optional series — only attach when it answers the insight (never decorative). */
export type OverviewInsightChart = {
  points: Array<{ label: string; value: number }>;
  /** Horizontal baseline (e.g. longer-window average). */
  baseline?: number;
  baselineLabel?: string;
  currentLabel?: string;
};

export type OverviewInsightCompare = {
  primary: { label: string; value: string };
  secondary: { label: string; value: string };
};

export type OverviewInsight = {
  id: string;
  /** Health-style category in the tinted header (e.g. "Close rate"). */
  category: string;
  /** SF symbol name for the header glyph. */
  sf: string;
  /** Narrative takeaway — primary Health copy under the header. */
  insight: string;
  /** @deprecated Prefer `insight` — kept for secondary notes list. */
  title: string;
  detail?: string;
  body?: string;
  cta?: string;
  tone: InsightTone;
  route?: '/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
  /** Dual metrics (Today vs Average) — only with real values. */
  compare?: OverviewInsightCompare | null;
  /** Trend chart — omit when the insight is a count/alert without a series. */
  chart?: OverviewInsightChart | null;
};

export type OverviewActivity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  statusLabel: string;
  statusTone: 'default' | 'warning' | 'success' | 'muted';
  category: ActivityCategory;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

export type OverviewCompany = {
  id: string;
  name: string;
  role: string;
};

export type OverviewWeekBar = {
  label: string;
  value: number;
};

export type OverviewRevenue = {
  label: string;
  value: number;
  growthPercent: number | null;
  weekBars: OverviewWeekBar[];
  todayNet?: number;
  todayIncome?: number;
  todayExpense?: number;
  route?: '/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type OverviewStatTile = {
  id: string;
  label: string;
  value: number;
  format: 'integer' | 'grouped';
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  route?: '/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type OverviewSnapshot = {
  attention: OverviewAttention;
  revenue: OverviewRevenue;
  statTiles: OverviewStatTile[];
  featuredInsight: OverviewInsight | null;
  insights: OverviewInsight[];
  activity: OverviewActivity[];
  companies: OverviewCompany[];
  /** @deprecated Use `revenue` + `statTiles` */
  today?: OverviewTodayStat[];
};
