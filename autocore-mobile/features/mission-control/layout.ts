import { rhythm, spacing } from '@/theme';

/** Mission Control — unified rhythm + typography */
export const mc = {
  pad: rhythm.pad,
  section: spacing[6],
  stack: spacing[4],
  hairline: rhythm.hairline,
  radius: rhythm.radius,
  cardRadius: rhythm.cardRadius,
  row: rhythm.rowMinHeight,
} as const;

/** Typography — numbers lead, labels recede */
export const mcType = {
  greeting: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500' as const,
    letterSpacing: -0.35,
  },
  greetingMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  section: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.4,
  },
  heroValue: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600' as const,
    letterSpacing: -0.55,
  },
  quietValue: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: -0.25,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  metricValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.35,
  },
  metricHint: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400' as const,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  rowMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  action: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  attentionCount: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.25,
  },
} as const;
