import { rhythm, screenMotion } from '@/theme/screen';

/** Settings — aliases unified screen rhythm */
export const settingsLayout = {
  pad: rhythm.pad,
  section: rhythm.section,
  cardRadius: rhythm.cardRadius,
  groupRadius: rhythm.cardRadius,
  hairline: rhythm.hairline,
  hubCardMinHeight: 88,
  rowMinHeight: rhythm.rowMinHeight,
  iconBox: rhythm.iconBox,
  stagger: screenMotion.stagger,
  maxVisibleTabs: 6,
  maxPrimaryTabs: 5,
} as const;
