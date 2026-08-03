import { rhythm, spacing, typography } from '@/theme';

/** Overview — aliases unified rhythm (no local scale ownership). */
export const mc = {
  pad: rhythm.pad,
  section: spacing[6],
  stack: spacing[4],
  hairline: rhythm.hairline,
  radius: rhythm.radius,
  cardRadius: rhythm.cardRadius,
  row: rhythm.rowMinHeight,
} as const;

/**
 * Typography aliases → DL v2 scale.
 * Prefer `<Text variant="…" />` in new MC components; keep mcType for gradual migration.
 */
export const mcType = {
  greeting: typography.title2,
  greetingMeta: typography.footnote,
  section: typography.sectionLabel,
  statValue: typography.title2,
  heroValue: typography.metric,
  quietValue: typography.headline,
  statLabel: typography.caption1,
  metricValue: typography.title3,
  metricHint: typography.caption2,
  rowTitle: typography.callout,
  rowMeta: typography.caption1,
  action: typography.footnote,
  attentionCount: typography.headline,
} as const;
