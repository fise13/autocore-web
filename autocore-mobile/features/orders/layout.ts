import { rhythm } from '@/theme/screen';

/** Orders — aliases unified screen rhythm */
export const ordersLayout = {
  pad: rhythm.pad,
  section: rhythm.section,
  hairline: rhythm.hairline,
  radius: rhythm.radius,
  cardRadius: rhythm.cardRadius,
  logo: rhythm.logoSm,
  title: rhythm.pageTitle,
  subtitle: rhythm.pageSubtitle,
  chipHeight: rhythm.chipHeight,
  searchHeight: rhythm.searchHeight,
  cardMinHeight: 128,
  kpiWidth: 148,
  kpiValue: 22,
  kpiLabel: rhythm.label,
  kpiHint: rhythm.meta,
  quickActionSize: rhythm.actionTile,
  quickIcon: 24,
  workflowDot: 7,
} as const;
