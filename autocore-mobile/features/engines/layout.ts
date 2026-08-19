/**
 * Engine rhythm — aliases of DL v3 tokens only.
 *
 * The yard is a document: a warm canvas, hairline rules, type doing the rest.
 * Two surface levels (page / frame), never a third. Radius stays in the 8–12
 * band. Domain ink (status, quality) lives on tags, not on fills.
 */
import { typography } from '@/theme';
import { tokens } from '@/theme/tokens';

export const eng = {
  pad: tokens.space.screenX, // 20
  section: tokens.space.section, // 32 — between chapters
  chapter: tokens.space.section,
  block: tokens.space[6], // 24 — inside a chapter
  stack: tokens.space.stack, // 12
  inline: tokens.space.inline, // 8
  tight: tokens.space[1.5], // 6
  micro: tokens.space.micro, // 4
  hairline: tokens.control.hairline,
  /** Visible document rule — 1pt, not the iOS 0.33 hairline. */
  rule: 1,

  /** Controls, search, ink buttons. */
  radius: 8,
  /** Framed sheets — spec lists, notes, documentation. */
  cardRadius: tokens.radius.group, // 12
  sheetRadius: tokens.radius.sheet, // 16
  pillRadius: tokens.radius.full,

  rowMin: tokens.control.hitTarget,
  control: tokens.control.heightMd, // 40 visual, ≥44 via hitSlop
  hit: tokens.control.hitTarget,

  thumb: 52,
  thumbRadius: 8,
  tag: 22,
  nav: 36,
  ink: tokens.control.hitTarget,
  rail: 2,
} as const;

/** Semantic typography aliases — maps to `theme/typography`, never new sizes. */
export const engType = {
  serial: typography.largeTitle,
  motor: typography.title2,
  specLabel: typography.subheadline,
  specValue: typography.callout,
  section: typography.sectionLabel,
  status: typography.caption1,
  hint: typography.footnote,
  body: typography.body,
  kicker: typography.caption1,
  variant: typography.title3,
  rowTitle: typography.identifier,
  rowMeta: typography.footnote,
  control: typography.caption1,
  count: typography.caption1,
  tag: typography.caption2,
} as const;

/** Display numerals must not wrap the layout when Dynamic Type is turned up. */
export const engFontCap = {
  serial: 1.15,
  title: 1.2,
  control: 1.15,
  body: 1.35,
} as const;
