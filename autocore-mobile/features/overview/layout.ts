import { spacing, typography } from '@/theme';
import { tokens } from '@/theme/tokens';

/**
 * Mission Control home — revenue hero, tiles, quick actions, AI, recent.
 */
export const mc = {
  pad: tokens.space.screenX, // 20
  section: tokens.space.section, // 32
  stack: spacing[4], // 16 — card internal stack
  hairline: tokens.control.hairline,
  /** Soft squircle for hero / tile cards */
  radius: tokens.radius.modal, // 20
  cardRadius: tokens.radius.modal,
  row: tokens.control.heightLg,
} as const;

/** @deprecated Prefer `mc` — kept for Health-era home components still in tree. */
export const home = {
  pad: mc.pad,
  section: mc.section,
  stack: tokens.space.stack,
  cardGap: tokens.space[2.5],
  cardPad: tokens.space[4],
  hairline: mc.hairline,
  cardRadius: tokens.radius.sheet,
  metricSize: 36,
  metricLineHeight: 41,
  sectionTitleSize: 28,
  sectionTitleLineHeight: 34,
} as const;

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
