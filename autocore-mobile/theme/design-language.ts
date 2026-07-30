/**
 * Autocore Design Language — single source of truth.
 * All components must reference this file (directly or via hooks).
 */
import type { ColorScheme } from './colors';
import { getColors } from './colors';
import { withAlpha } from './color-utils';
import { radius, baseRadius } from './radius';
import { spacing, screenPadding, minTouchTarget, headerHeight } from './spacing';
import { typography, fontFamily, fontWeight } from './typography';
import { semanticOpacity } from './opacity';
import { getShadows } from './shadow';
import { zIndex } from './zIndex';
import { sidebarWidth, contentMaxWidth } from './breakpoints';
import {
  autocoreEase,
  smoothEase,
  duration,
  spring,
  staggerDelay,
} from './animations';

/** Corner — continuous rounded (Apple-style superellipse approximation via large radii) */
export const cornerStyle = {
  continuous: true,
  default: radius.lg,
  card: radius['2xl'],
  sheet: radius['3xl'],
  modal: radius['2xl'],
  chip: radius.full,
  control: radius.lg,
  sm: radius.sm,
  base: baseRadius,
} as const;

/** Surface hierarchy */
export function surfaceStyle(scheme: ColorScheme) {
  const c = getColors(scheme);
  return {
    base: { backgroundColor: c.background },
    primary: { backgroundColor: c.surface },
    secondary: { backgroundColor: c.surfaceSecondary },
    elevated: { backgroundColor: c.surfaceElevated },
    muted: { backgroundColor: c.muted },
    card: { backgroundColor: c.card },
    inset: { backgroundColor: withAlpha(c.muted, 0.55) },
  } as const;
}

/** Glass / blur surfaces — mirrors .mc-glass-panel */
export const glassStyle = {
  blurStrength: 12,
  blurStrengthReduced: 8,
  blurStrengthLow: 0,
  tintOpacity: semanticOpacity.glass,
  borderOpacity: semanticOpacity.borderSubtle,
} as const;

/** Border tokens */
export function borderStyle(scheme: ColorScheme) {
  const c = getColors(scheme);
  return {
    default: { borderWidth: 1, borderColor: c.border },
    muted: { borderWidth: 1, borderColor: c.borderMuted },
    input: { borderWidth: 1, borderColor: c.input },
    ring: { borderWidth: 1, borderColor: withAlpha(c.foreground, semanticOpacity.borderSubtle) },
    dashed: { borderWidth: 1, borderStyle: 'dashed' as const, borderColor: withAlpha(c.border, 0.7) },
    focus: { borderWidth: 1, borderColor: c.ring },
  } as const;
}

/** Chrome dimensions */
export const navigationHeight = 52;
export const toolbarHeight = headerHeight;
export const tabBarHeight = navigationHeight;
export const bottomBarHeight = 56;

/** Interactive targets — Apple HIG minimum 44pt */
export const touchTarget = {
  minimum: minTouchTarget,
  comfortable: 44,
  large: 48,
  icon: 32,
  iconSm: 28,
  iconLg: 36,
} as const;

export const buttonHeight = {
  xs: 24,
  sm: touchTarget.iconSm,
  default: touchTarget.icon,
  lg: 40,
  xl: 40,
} as const;

/** Icon system defaults */
export const iconWeight = {
  stroke: 2,
  strokeBold: 2.5,
  strokeLight: 1.75,
} as const;

/** Motion defaults — iOS-like feel */
export const animationSpeed = {
  instant: duration.instant,
  fast: duration.fast,
  normal: duration.normal,
  medium: duration.medium,
  slow: duration.slow,
} as const;

export const defaultSpring = spring.default;
export const defaultDuration = duration.normal;
export const defaultEasing = autocoreEase;
export const defaultEaseOut = smoothEase;

/** Transition presets (durations + easing) */
export const pageTransition = {
  duration: duration.page,
  easing: autocoreEase,
  translateY: 8,
  opacity: [0, 1] as const,
} as const;

export const modalTransition = {
  duration: duration.medium,
  easing: autocoreEase,
  scale: [0.96, 1] as const,
  translateY: [12, 0] as const,
} as const;

export const sheetTransition = {
  duration: duration.medium,
  easing: autocoreEase,
  spring: spring.sheet,
  backdropDuration: duration.fast,
} as const;

/** Elevation & spacing rhythm */
export function defaultShadow(scheme: ColorScheme) {
  return getShadows(scheme).sm;
}

export const defaultRadius = cornerStyle.default;
export const defaultPadding = screenPadding.horizontal;
export const defaultGap = spacing[4];

/** Layout rhythm */
export const layoutRhythm = {
  screenPadding,
  contentMaxWidth,
  sidebar: sidebarWidth,
  cardPadding: spacing[4],
  cardPaddingSm: spacing[3],
  cardGap: spacing[3],
  sectionGap: spacing[6],
  listGap: spacing[2.5],
  inlineGap: spacing[2],
  stackGap: spacing[3],
} as const;

/** Typography reference */
export const typeScale = typography;
export const typeFamily = fontFamily;
export const typeWeight = fontWeight;

/**
 * Semantic tone styles for badges, chips and tinted icon tiles.
 *
 * `bg`/`fg`/`border` come from the pre-composited tone tokens rather than
 * runtime alpha, so the pairing is guaranteed to clear WCAG AA — the old
 * alpha-blended version dropped to 2.45:1 for success in the light theme.
 * `solid`/`onSolid` are the filled-button counterpart of the same tone.
 */
export function toneStyles(scheme: ColorScheme) {
  const c = getColors(scheme);
  return {
    primary: {
      bg: c.primarySubtle,
      fg: c.primaryOnSubtle,
      border: c.primaryBorder,
      solid: c.primary,
      onSolid: c.primaryForeground,
    },
    success: {
      bg: c.successSubtle,
      fg: c.successOnSubtle,
      border: c.successBorder,
      solid: c.success,
      onSolid: c.successForeground,
    },
    warning: {
      bg: c.warningSubtle,
      fg: c.warningOnSubtle,
      border: c.warningBorder,
      solid: c.warning,
      onSolid: c.warningForeground,
    },
    danger: {
      bg: c.dangerSubtle,
      fg: c.dangerOnSubtle,
      border: c.dangerBorder,
      solid: c.danger,
      onSolid: c.dangerForeground,
    },
    muted: {
      bg: c.muted,
      fg: c.mutedForeground,
      border: c.borderMuted,
      solid: c.muted,
      onSolid: c.mutedForeground,
    },
    default: {
      bg: c.secondary,
      fg: c.foreground,
      border: c.border,
      solid: c.secondary,
      onSolid: c.secondaryForeground,
    },
  } as const;
}

export type ToneName = keyof ReturnType<typeof toneStyles>;

/** Z-index reference */
export const layering = zIndex;

/** Stagger helper */
export { staggerDelay };
