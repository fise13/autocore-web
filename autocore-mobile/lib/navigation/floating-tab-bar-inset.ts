import { spacing } from '@/theme/spacing';

/** Inner tab row height — keep in sync with AppTabBar. */
export const TAB_BAR_ROW_HEIGHT = 52;

/** Vertical padding inside the floating pill. */
export const TAB_BAR_VERTICAL_PADDING = spacing[2];

/** Floating pill tab bar: row + vertical padding + hairline border. */
export const FLOATING_TAB_PILL_HEIGHT =
  TAB_BAR_ROW_HEIGHT + TAB_BAR_VERTICAL_PADDING * 2 + 2;

/** Breathing room between the tab pill and screen edges / footers. */
export const FLOATING_TAB_BAR_GAP = spacing[3];

/** Sticky action footer: button row + top padding. */
export const SCREEN_ACTION_FOOTER_HEIGHT = 52 + 12;

export function getFloatingTabBarOffset(bottomSafeInset: number) {
  return Math.max(bottomSafeInset, spacing[2]) + FLOATING_TAB_PILL_HEIGHT + FLOATING_TAB_BAR_GAP;
}

export function getScreenActionScrollInset(bottomSafeInset: number) {
  return getFloatingTabBarOffset(bottomSafeInset) + SCREEN_ACTION_FOOTER_HEIGHT + spacing[3];
}
