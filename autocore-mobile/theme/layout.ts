import { spacing, screenPadding, headerHeight, minTouchTarget } from './spacing';
import { radius } from './radius';
import { sidebarWidth, contentMaxWidth } from './breakpoints';

/** Layout constants from Autocore app shell */
export const layout = {
  screenPadding,
  headerHeight,
  minTouchTarget,
  tabBarHeight: 52,
  bottomBarHeight: 56,
  floatingButtonSize: 56,
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
  },
  card: {
    padding: spacing[4],
    paddingSm: spacing[3],
    gap: spacing[4],
    borderRadius: radius.xl,
  },
  input: {
    height: 32,
    heightLg: 36,
    heightXl: 44,
    paddingHorizontal: spacing[2.5],
    borderRadius: radius.lg,
  },
  button: {
    height: 32,
    heightSm: 28,
    heightLg: 36,
    heightXl: 44,
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
