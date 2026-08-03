/** Autocore spacing scale — 2px base unit */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

export type SpacingKey = keyof typeof spacing;

export function space(key: SpacingKey): number {
  return spacing[key];
}

/** Common layout paddings — matches `theme/screen.ts` rhythm / DL v2 */
export const screenPadding = {
  horizontal: spacing[4],
  vertical: spacing[3],
  safeHorizontal: spacing[4],
} as const;

/** Minimum touch target — Apple HIG 44pt */
export const minTouchTarget = 44;

/** Header height from dashboard mobile */
export const headerHeight = 52;
