import { layout } from './layout';

/** Default icon sizes aligned with Autocore web [&_svg]:size-4 pattern */
export const iconSizes = {
  xs: layout.iconSize.xs,
  sm: layout.iconSize.sm,
  md: layout.iconSize.md,
  lg: layout.iconSize.lg,
  xl: layout.iconSize.xl,
} as const;

export const defaultIconStrokeWidth = 2;

export type IconSize = keyof typeof iconSizes;
