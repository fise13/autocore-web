import type { ComponentType } from 'react';

export type ActivityCategory = 'inventory' | 'sale' | 'order' | 'warranty' | 'reservation';

export type MissionControlAttentionItem = {
  count: number;
  text: string;
  tone: 'warning' | 'danger';
  route?: '/(tabs)/orders' | '/(tabs)/search' | '/(tabs)/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type MissionControlAttention = {
  title: string;
  items: MissionControlAttentionItem[];
};

export type TodayStatFormat = 'integer' | 'currency-rub' | 'grouped';

export type StatEmphasis = 'hero' | 'default' | 'quiet';

export type MissionControlTodayStat = {
  id: string;
  label: string;
  value: number;
  format: TodayStatFormat;
  emphasis?: StatEmphasis;
  tone?: 'default' | 'warning' | 'success';
  route?: '/(tabs)/orders' | '/(tabs)/search' | '/(tabs)/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type KpiTone = 'primary' | 'success' | 'warning' | 'muted';

/** @deprecated Merged into `today` — kept for mock snapshots */
export type MissionControlKpi = {
  id: string;
  label: string;
  value: number;
  format: TodayStatFormat | 'grouped';
  hint?: string;
  tone: KpiTone;
  route?: '/(tabs)/orders' | '/(tabs)/search' | '/(tabs)/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type MissionControlQuickAction = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  route?: '/(tabs)/scan' | '/(tabs)/search' | '/(tabs)/warehouse' | '/(tabs)/orders' | '/(tabs)/orders/new' | '/(tabs)/accounting';
};

export type InsightTone = 'neutral' | 'positive' | 'warning';

export type MissionControlInsight = {
  id: string;
  title: string;
  detail?: string;
  body?: string;
  cta?: string;
  tone: InsightTone;
  route?: '/(tabs)/orders' | '/(tabs)/search' | '/(tabs)/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type MissionControlActivity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  statusLabel: string;
  statusTone: 'default' | 'warning' | 'success' | 'muted';
  category: ActivityCategory;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

export type MissionControlCompany = {
  id: string;
  name: string;
  role: string;
};

export type MissionControlWeekBar = {
  label: string;
  value: number;
};

export type MissionControlRevenue = {
  label: string;
  value: number;
  growthPercent: number | null;
  weekBars: MissionControlWeekBar[];
  todayNet?: number;
  todayIncome?: number;
  todayExpense?: number;
  route?: '/(tabs)/orders' | '/(tabs)/search' | '/(tabs)/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type MissionControlStatTile = {
  id: string;
  label: string;
  value: number;
  format: 'integer' | 'grouped';
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  route?: '/(tabs)/orders' | '/(tabs)/search' | '/(tabs)/warehouse' | '/(tabs)/accounting';
  routeParams?: Record<string, string>;
};

export type MissionControlSnapshot = {
  attention: MissionControlAttention;
  revenue: MissionControlRevenue;
  statTiles: MissionControlStatTile[];
  quickActions: MissionControlQuickAction[];
  featuredInsight: MissionControlInsight | null;
  insights: MissionControlInsight[];
  activity: MissionControlActivity[];
  companies: MissionControlCompany[];
  /** @deprecated Use `revenue` + `statTiles` */
  today?: MissionControlTodayStat[];
};
