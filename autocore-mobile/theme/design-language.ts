/**
 * Autocore Design Language — single source of truth.
 * All components must reference this file (directly or via hooks).
 */
import type { ColorScheme, SemanticColors } from './colors';
import { getColors } from './colors';
import { withAlpha } from './color-utils';
import { baseRadius } from './radius';
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
import { tokens } from './tokens';

/** Corner — Apple-adjacent DL v3 scale */
export const cornerStyle = {
  continuous: true,
  default: tokens.radius.control,
  card: tokens.radius.group,
  sheet: tokens.radius.sheet,
  modal: tokens.radius.modal,
  chip: tokens.radius.full,
  control: tokens.radius.control,
  sm: 8,
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

/** Interactive targets — Apple HIG minimum 44pt (visual may be smaller + hitSlop). */
export const touchTarget = {
  minimum: tokens.control.hitTarget,
  comfortable: tokens.control.hitTarget,
  large: tokens.control.heightLg,
  icon: tokens.control.heightSm,
  iconSm: tokens.control.heightXs,
  iconLg: tokens.control.heightMd,
} as const;

export const buttonHeight = {
  xs: tokens.control.heightXs,
  sm: tokens.control.heightSm,
  default: tokens.control.heightMd,
  lg: tokens.control.heightLg,
  xl: tokens.control.heightXl,
} as const;

/** Icon system defaults — thin outline for Claude/Linear quiet chrome */
export const iconWeight = {
  stroke: 1.5,
  strokeBold: 2,
  strokeLight: 1.35,
} as const;

/** Motion defaults — iOS-like feel */
export const animationSpeed = {
  instant: duration.instant,
  fast: duration.fast,
  normal: duration.normal,
  medium: duration.medium,
  slow: duration.slow,
} as const;

export const defaultSpring = spring.settle;
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

/** Elevation — cards stay flat; floating/modal use shadows (DL v3). */
export function defaultShadow(_scheme: ColorScheme) {
  return getShadows(_scheme).none;
}

export function floatingShadow(scheme: ColorScheme) {
  return getShadows(scheme).elevated;
}

export const defaultRadius = cornerStyle.default;
export const defaultPadding = screenPadding.horizontal;
export const defaultGap = spacing[4];

/** Layout rhythm — aliases of tokens.space (DL v3). */
export const layoutRhythm = {
  screenPadding,
  contentMaxWidth,
  sidebar: sidebarWidth,
  cardPadding: tokens.space[4],
  cardPaddingSm: tokens.space[3],
  cardGap: tokens.space.stack,
  sectionGap: tokens.space.section,
  listGap: tokens.space[2.5],
  inlineGap: tokens.space.inline,
  stackGap: tokens.space.stack,
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
export function toneStyles(schemeOrColors: ColorScheme | SemanticColors) {
  const c = typeof schemeOrColors === 'string' ? getColors(schemeOrColors) : schemeOrColors;
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

/**
 * iOS native controls — Autocore API → `@expo/ui` SwiftUI modifiers.
 * Android keeps RN Pressable with HIG-like sizes (not Compose in this wave).
 */
export const iosControls = {
  /** Glass is off — product chrome stays Claude-static (bordered / plain). */
  glassMinOsMajor: 26,
  styles: {
    default: {
      preferred: 'borderedProminent' as const,
      fallback: 'borderedProminent' as const,
      use: 'Primary CTAs — solid, quiet, no liquid glass',
    },
    outline: {
      preferred: 'bordered' as const,
      fallback: 'bordered' as const,
      use: 'Secondary actions next to a primary',
    },
    secondary: {
      preferred: 'bordered' as const,
      fallback: 'bordered' as const,
      use: 'Quiet filled / bordered secondary',
    },
    ghost: {
      preferred: 'plain' as const,
      fallback: 'plain' as const,
      use: 'Toolbar and inline icon-adjacent actions',
    },
    link: {
      preferred: 'borderless' as const,
      fallback: 'borderless' as const,
      use: 'Text-only navigation links',
    },
    destructive: {
      preferred: 'bordered' as const,
      fallback: 'bordered' as const,
      role: 'destructive' as const,
      use: 'Delete / irreversible confirms',
    },
  },
  sizes: {
    xs: 'mini' as const,
    sm: 'small' as const,
    default: 'regular' as const,
    lg: 'large' as const,
    xl: 'extraLarge' as const,
    icon: 'circle + regular' as const,
  },
  shapes: {
    pill: 'capsule' as const,
    default: 'roundedRectangle' as const,
    icon: 'circle' as const,
  },
  whenGlass:
    'Do not use glass / glassProminent in product UI. Prefer borderedProminent / bordered / plain (Claude-static). Form CTAs: Button native={false}. Toolbar icons may stay native plain.',
} as const;

/** Z-index reference */
export const layering = zIndex;

/** Stagger helper */
export { staggerDelay };
