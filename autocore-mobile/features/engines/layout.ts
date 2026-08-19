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
  pad: tokens.space.screenX,
  section: tokens.space.section,
  chapter: tokens.space.section,
  block: tokens.space[6],
  stack: tokens.space.stack,
  inline: tokens.space.inline,
  tight: tokens.space[1.5],
  micro: tokens.space.micro,
  hairline: tokens.control.hairline,
  /** Visible document rule — 1pt, not the iOS 0.33 hairline. */
  rule: 1,

  radius: 8,
  cardRadius: tokens.radius.group,
  sheetRadius: tokens.radius.sheet,
  pillRadius: tokens.radius.full,

  rowMin: tokens.control.hitTarget,
  control: tokens.control.heightMd,
  hit: tokens.control.hitTarget,

  thumb: 52,
  thumbRadius: 8,
  tag: 22,
  nav: 36,
  ink: tokens.control.hitTarget,
  rail: 2,
} as const;

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

export const engFontCap = {
  serial: 1.15,
  title: 1.2,
  control: 1.15,
  body: 1.35,
} as const;
