import type { ComponentType } from 'react';

export type ActivityCategory = 'inventory' | 'sale' | 'order' | 'warranty' | 'reservation';

export type OverviewAttentionItem = {
  count: number;
  text: string;
  tone: 'warning' | 'danger';
  route?: '/(tabs)/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
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
  route?: '/(tabs)/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
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
  route?: '/(tabs)/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type InsightTone = 'neutral' | 'positive' | 'warning';

export type OverviewInsight = {
  id: string;
  title: string;
  detail?: string;
  body?: string;
  cta?: string;
  tone: InsightTone;
  route?: '/(tabs)/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
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
  route?: '/(tabs)/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type OverviewStatTile = {
  id: string;
  label: string;
  value: number;
  format: 'integer' | 'grouped';
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  route?: '/(tabs)/orders' | '/search' | '/warehouse' | '/(tabs)/accounting';
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
