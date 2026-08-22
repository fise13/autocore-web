import type { TextStyle } from 'react-native';

import { spacing, typography } from '@/theme';
import { tokens } from '@/theme/tokens';

/**
 * Finance rhythm — aliases of the DL tokens, never new values.
 *
 * The surface reads as one continuous document rather than a deck of cards:
 * `chapter` is the beat between narrative sections, `block` the beat inside
 * one, and grouped rows sit on a single sheet radius. Only two surface levels
 * exist here — the canvas and one sheet — so hierarchy comes from type and
 * space instead of stacked containers.
 */
export const fin = {
  pad: tokens.space.screenX, // 20
  chapter: spacing[10], // 40 — between narrative sections
  block: spacing[6], // 24 — inside a section
  stack: spacing[4], // 16
  inline: spacing[2], // 8
  tight: spacing[1.5], // 6
  micro: spacing[1], // 4

  hairline: tokens.control.hairline,
  sheetRadius: tokens.radius.sheet, // 16
  rowRadius: tokens.radius.group, // 12
  pillRadius: tokens.radius.full,

  rowHeight: 56,
  railHeight: 8,
  chartHeight: 176,
  chartPadTop: 14,
  chartPadBottom: 22,
  /** Keeps the end-point marker and its halo inside the canvas. */
  chartPadX: 9,

  pressScale: 0.98,
  pressInMs: 140,
} as const;

/**
 * Financial typography — one display face for headline quantities, a quiet
 * label face for everything that frames them. All numerals are tabular so a
 * value never shifts width while scrubbing or animating.
 */
const tabular = { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] };

export const finType = {
  screenTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
  },
  /** The single largest number on the screen — net profit. */
  hero: {
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '700' as const,
    letterSpacing: -1.6,
    ...tabular,
  },
  /** Health index — same family as the hero, one step down. */
  score: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '700' as const,
    letterSpacing: -2,
    ...tabular,
  },
  /** Section-level quantities: trend values, flow totals. */
  metric: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '600' as const,
    letterSpacing: -0.6,
    ...tabular,
  },
  /** Row-level quantities. */
  amount: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    ...tabular,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  rowTitle: {
    ...typography.callout,
    fontWeight: '500' as const,
  },
  rowMeta: typography.footnote,
  label: {
    ...typography.footnote,
    fontWeight: '500' as const,
  },
  caption: typography.caption1,
  delta: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    ...tabular,
  },
} as const;

/** Display numerals must not wrap the layout when Dynamic Type is turned up. */
export const finFontCap = {
  hero: 1.15,
  metric: 1.2,
  body: 1.35,
} as const;
