import { spacing, screenPadding, headerHeight, minTouchTarget } from './spacing';
import { radius } from './radius';
import { sidebarWidth, contentMaxWidth } from './breakpoints';
import { rhythm } from './screen';

/**
 * Screen primitive contract — feature `layout.ts` files must alias these
 * (or `rhythm.*`) instead of inventing local pad / radius / title sizes.
 *
 * | Token | Source | Use |
 * |-------|--------|-----|
 * | screenPad | rhythm.pad | Horizontal inset |
 * | sectionGap | rhythm.section | Between major sections |
 * | cardRadius | rhythm.cardRadius | Cards / list groups |
 * | pageTitle | rhythm.pageTitle | Hub titles (Login form weight) |
 */
export const layout = {
  screenPadding,
  /** @see rhythm.pad — preferred name for new code */
  screenPad: rhythm.pad,
  sectionGap: rhythm.section,
  cardRadius: rhythm.cardRadius,
  pageTitle: rhythm.pageTitle,
  pageTitleLineHeight: rhythm.pageTitleLineHeight,
  headerHeight,
  minTouchTarget,
  tabBarHeight: 52,
  bottomBarHeight: 56,
  floatingButtonSize: 56,
  rhythm,
  iconSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  },
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': rhythm.avatar,
  },
  card: {
    padding: spacing[4],
    paddingSm: spacing[3],
    gap: spacing[4],
    borderRadius: rhythm.cardRadius,
  },
  input: {
    height: 32,
    heightCompact: 32,
    heightLg: 40,
    heightXl: 40,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
  },
  button: {
    height: 32,
    heightSm: 28,
    heightLg: 40,
    heightXl: 40,
    iconSize: 32,
    borderRadius: radius.lg,
  },
  sidebar: sidebarWidth,
  contentMaxWidth,
  bottomSheet: {
    handleHeight: 4,
    handleWidth: 36,
    borderRadius: radius['2xl'],
  },
  segmentedControl: {
    height: 36,
    borderRadius: radius.lg,
  },
  chip: {
    height: 20,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
  },
  badge: {
    height: 20,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
  },
} as const;
