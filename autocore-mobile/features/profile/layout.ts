import { rhythm, screenMotion } from '@/theme/screen';

/** Profile — aliases unified screen rhythm */
export const profileLayout = {
  pad: rhythm.pad,
  section: rhythm.section,
  groupRadius: rhythm.cardRadius,
  cardRadius: rhythm.cardRadius,
  hairline: rhythm.hairline,
  logo: rhythm.logoSm,
  title: rhythm.pageTitle,
  subtitle: rhythm.pageSubtitle,
  sectionTitle: rhythm.sectionTitle,
  avatar: rhythm.avatar,
  actionMinHeight: 72,
  rowMinHeight: rhythm.rowMinHeight,
  iconBox: rhythm.iconBox,
  stagger: screenMotion.stagger,
} as const;
