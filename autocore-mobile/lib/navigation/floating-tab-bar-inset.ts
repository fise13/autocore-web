import { spacing } from '@/theme/spacing';

/**
 * Height of the native iOS 26 tab bar capsule.
 *
 * `react-native-screens` cannot report the bar's measured height, so this is a
 * constant. It only has to be close enough for sticky footers to clear the bar —
 * scroll views get their real inset from the system when they opt into
 * `contentInsetAdjustmentBehavior="automatic"`.
 */
export const NATIVE_TAB_BAR_HEIGHT = 50;

/** Sticky action footer: button row + top padding. */
export const SCREEN_ACTION_FOOTER_HEIGHT = 52 + 12;

/** Bottom offset for absolutely positioned chrome that must clear the tab bar. */
export function getFloatingTabBarOffset(bottomSafeInset: number) {
  return Math.max(bottomSafeInset, spacing[2]) + NATIVE_TAB_BAR_HEIGHT;
}

/** Scroll padding for screens that also carry a sticky action footer. */
export function getScreenActionScrollInset(bottomSafeInset: number) {
  return getFloatingTabBarOffset(bottomSafeInset) + SCREEN_ACTION_FOOTER_HEIGHT + spacing[3];
}
