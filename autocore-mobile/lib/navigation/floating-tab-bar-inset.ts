import { glassNav } from '@/theme/glass';
import { spacing } from '@/theme/spacing';

/**
 * Footprint of the floating Liquid Glass navigation.
 *
 * The bar is absolutely positioned, so nothing below it shrinks the scene and
 * UIKit never learns it is there — `contentInsetAdjustmentBehavior` only knows
 * about the safe area. Every scroll view therefore gets its bottom room from
 * here, and these are the numbers that keep the last row of content clear of
 * the glass.
 */
export const GLASS_TAB_BAR_HEIGHT = glassNav.barHeight;

/** Gap between the bar and the bottom safe-area inset. */
export const GLASS_TAB_BAR_BOTTOM_GAP = glassNav.barBottomGap;

/** The AI action floats clear of the bar; content has to clear it too. */
export const AI_ACTION_BLOCK = glassNav.aiGap + glassNav.aiSize;

/** Sticky action footer: button row + top padding. */
export const SCREEN_ACTION_FOOTER_HEIGHT = 52 + 12;

/** Bottom offset for absolutely positioned chrome that must clear the bar. */
export function getFloatingTabBarOffset(bottomSafeInset: number) {
  return (
    Math.max(bottomSafeInset, GLASS_TAB_BAR_BOTTOM_GAP) +
    GLASS_TAB_BAR_BOTTOM_GAP +
    GLASS_TAB_BAR_HEIGHT
  );
}

/** Bottom edge of the AI action, measured from the bottom of the screen. */
export function getAiActionOffset(bottomSafeInset: number) {
  return getFloatingTabBarOffset(bottomSafeInset) + glassNav.aiGap;
}

/**
 * Scroll padding for tab screens. Clears the bar, then whichever is taller of a
 * sticky action footer or the AI action, then a little breathing room — so the
 * final section of a screen can always be scrolled out from under the glass.
 */
export function getScreenActionScrollInset(bottomSafeInset: number) {
  return (
    getFloatingTabBarOffset(bottomSafeInset) +
    Math.max(SCREEN_ACTION_FOOTER_HEIGHT, AI_ACTION_BLOCK) +
    spacing[3]
  );
}
