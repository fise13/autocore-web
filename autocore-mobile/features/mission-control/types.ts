import type { ComponentType } from 'react';

export type ActivityCategory = 'inventory' | 'sale' | 'order' | 'warranty' | 'reservation';

export type MissionControlAttentionItem = {
  count: number;
  text: string;
  tone: 'warning' | 'danger';
};

export type MissionControlAttention = {
  title: string;
  items: MissionControlAttentionItem[];
};

export type OverviewTrendTone = 'primary' | 'success' | 'chart2' | 'muted';

export type MissionControlOverviewMetric = {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  hint?: string;
  hintTone?: 'success' | 'muted';
  trend: number[];
  trendTone: OverviewTrendTone;
};

export type MissionControlQuickAction = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  route?: '/(tabs)/scan' | '/(tabs)/search' | '/(tabs)/orders';
  primary?: boolean;
};

export type MissionControlActivity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  category: ActivityCategory;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

export type MissionControlCompany = {
  id: string;
  name: string;
  role: string;
};

export type MissionControlSnapshot = {
  attention: MissionControlAttention;
  overview: MissionControlOverviewMetric[];
  quickActions: MissionControlQuickAction[];
  activity: MissionControlActivity[];
  companies: MissionControlCompany[];
};
