import { spacing } from '@/theme/spacing';

/**
 * Autocore floating dock metrics.
 * Liquid glass (iOS 26+): UIGlassEffect via expo-glass-effect.
 * Fallback: dense dark stadium. Spec 356×64 · radius 32 · action 60 · icons 22 · safe+8.
 */
export const DOCK_BAR_WIDTH = 356;
export const DOCK_VISUAL_HEIGHT = 64;
export const DOCK_CORNER_RADIUS = 32;
export const DOCK_ITEM_WIDTH = 71;
export const DOCK_ACTION_SIZE = 60;
export const DOCK_ACTION_RADIUS = 30;
export const DOCK_ICON_SIZE = 22;
export const DOCK_ACTION_ICON_SIZE = 28;
export const DOCK_ACTION_ICON_STROKE = 2.5;
export const DOCK_LABEL_SIZE = 12;
/** Side margin from screen edge. */
export const DOCK_HORIZONTAL_INSET = 18.5;
/** Gap between bar bottom and safe-area inset. */
export const DOCK_BOTTOM_GAP = 8;
export const DOCK_BORDER_WIDTH = 1;

/** Quiet dark chrome — matches AutoCore cards, not Vision Pro glass. */
export const DOCK_FILL = 'rgba(25, 28, 34, 0.82)';
export const DOCK_BORDER = 'rgba(255, 255, 255, 0.12)';
export const DOCK_BLUR_INTENSITY = 20;
export const DOCK_INK = '#ffffff';
export const DOCK_MUTED_ALPHA = 0.55;
export const DOCK_ACTION_FILL = '#ffffff';
export const DOCK_ACTION_INK = '#0a0a0a';

/** @deprecated Capsule selection removed. */
export const DOCK_ACTIVE_CAPSULE_HEIGHT = 40;
/** @deprecated */
export const DOCK_ACTIVE_CAPSULE_RADIUS = 20;
/** @deprecated Detached orb gap — action is inside the bar. */
export const DOCK_GAP = 0;
/** @deprecated */
export const DOCK_PILL_PAD_X = 0;

/** @deprecated Use DOCK_VISUAL_HEIGHT. */
export const NATIVE_TAB_BAR_HEIGHT = DOCK_VISUAL_HEIGHT;

/** Sticky action footer: button row + top padding. */
export const SCREEN_ACTION_FOOTER_HEIGHT = 52 + 12;

/** Bottom offset for absolutely positioned chrome that must clear the dock row. */
export function getFloatingTabBarOffset(bottomSafeInset: number) {
  return bottomSafeInset + DOCK_BOTTOM_GAP + DOCK_VISUAL_HEIGHT;
}

/** Scroll padding for screens that also carry a sticky action footer. */
export function getScreenActionScrollInset(bottomSafeInset: number) {
  return getFloatingTabBarOffset(bottomSafeInset) + SCREEN_ACTION_FOOTER_HEIGHT + spacing[3];
}
