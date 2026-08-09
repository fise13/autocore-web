import { spacing } from '@/theme/spacing';

/**
 * Autocore floating dock — pixel match to reference stadium pill + create orb.
 * Spec from design photos: 48h pill · 72 item · 1px rim · stadium ends.
 */
export const DOCK_VISUAL_HEIGHT = 48;
export const DOCK_CORNER_RADIUS = 24;
export const DOCK_ITEM_WIDTH = 72;
export const DOCK_ACTION_SIZE = 48;
export const DOCK_GAP = 8;
export const DOCK_HORIZONTAL_INSET = 16;
export const DOCK_BOTTOM_GAP = 8;
/** Active capsule — inset ~4pt from pill top/bottom. */
export const DOCK_ACTIVE_CAPSULE_HEIGHT = 40;
export const DOCK_ACTIVE_CAPSULE_RADIUS = 20;
/** Visible rim — not iOS hairline (0.33). */
export const DOCK_BORDER_WIDTH = 1;
export const DOCK_PILL_PAD_X = 4;

/** @deprecated Use DOCK_VISUAL_HEIGHT — kept for call sites during migration. */
export const NATIVE_TAB_BAR_HEIGHT = DOCK_VISUAL_HEIGHT;

/** Sticky action footer: button row + top padding. */
export const SCREEN_ACTION_FOOTER_HEIGHT = 52 + 12;

/** Bottom offset for absolutely positioned chrome that must clear the dock row. */
export function getFloatingTabBarOffset(bottomSafeInset: number) {
  return Math.max(bottomSafeInset, spacing[2]) + DOCK_VISUAL_HEIGHT + DOCK_BOTTOM_GAP;
}

/** Scroll padding for screens that also carry a sticky action footer. */
export function getScreenActionScrollInset(bottomSafeInset: number) {
  return getFloatingTabBarOffset(bottomSafeInset) + SCREEN_ACTION_FOOTER_HEIGHT + spacing[3];
}
