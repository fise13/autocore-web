import { rhythm, spacing } from '@/theme';

/** Accounting — MC / Notion rhythm */
export const ac = {
  pad: rhythm.pad,
  section: spacing[6],
  stack: spacing[4],
  sectionGap: rhythm.stack,
  hairline: rhythm.hairline,
  radius: rhythm.radius,
  cardRadius: rhythm.cardRadius,
  heroRadius: rhythm.heroRadius,
  filterHeight: rhythm.filterHeight,
  label: rhythm.label,
  meta: rhythm.meta,
  sectionTitle: rhythm.sectionTitle,
  row: rhythm.rowMinHeight,
  rowHeight: 68,
  rowPadX: rhythm.stack + 4,
  rowPadY: rhythm.tight + 2,
  rowGap: rhythm.stack,
  iconBox: 40,
  actionTile: rhythm.actionTile,
} as const;
