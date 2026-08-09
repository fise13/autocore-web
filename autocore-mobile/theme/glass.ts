/**
 * Liquid Glass — the material the floating navigation and the AI action are cut
 * from.
 *
 * Two implementations sit behind one set of tokens. On iOS 26 the real thing is
 * available (`UIGlassEffect`, via expo-glass-effect, already a dependency of
 * expo-router) and gives refraction and specular edges that no blur can fake;
 * everywhere else the same numbers drive a layered `BlurView` stack that lands
 * in roughly the same optical place.
 *
 * Everything here is a token, not an effect, so the bar, the active capsule and
 * the AI button stay one family — change a value once and all three move.
 */
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, type ViewStyle } from 'react-native';

import type { BlurTint } from 'expo-blur';

import type { ColorScheme } from './colors';
import { tokens } from './tokens';

let liquidGlassSupport: boolean | undefined;

/**
 * True when the OS renders real Liquid Glass rather than our blur stack.
 * Cached — the answer cannot change while the process is alive.
 */
export function supportsLiquidGlass(): boolean {
  if (liquidGlassSupport === undefined) {
    liquidGlassSupport = Platform.OS === 'ios' && isLiquidGlassAvailable();
  }
  return liquidGlassSupport;
}

/**
 * Navigation geometry. Fixed points, not ratios: the bar has to read the same
 * on a 320pt SE and a 440pt Pro Max, and only the slot width flexes.
 */
export const glassNav = {
  /** Bar shell. */
  barHeight: 76,
  barMarginX: 16,
  barRadius: 38,
  /** Gap between the bar and the bottom safe-area inset. */
  barBottomGap: 12,
  /** Inner padding around the slot row. */
  barPadX: 6,

  /** One tab slot. */
  slotMinTouch: 56,
  iconSize: 25,
  labelSize: 13,
  /**
   * Narrow slots take the smaller label. On a 320pt SE a four-up bar leaves 69pt
   * a slot, and "Overview" at 13pt all but touches its neighbour — a point down
   * buys the gap back without the labels reading as a different size.
   */
  labelSizeCompact: 12,
  compactSlotWidth: 78,
  iconLabelGap: 4,

  /** The travelling capsule. */
  capsuleHeight: 60,
  capsuleRadius: 30,
  /** How far the capsule sits inside its slot, per side. */
  capsuleInsetX: 3,

  /** The AI action, floating clear of the bar. */
  aiSize: 66,
  aiRadius: 33,
  aiGap: 12,
  aiGlyphSize: 26,
  /** Composer the AI button expands into. */
  composerRadius: 30,
  composerHeight: 184,
} as const;

/** Springs for the bar. Fast, critically damped — no playful overshoot. */
export const glassMotion = {
  /** Capsule travel between slots. */
  capsule: { stiffness: 420, damping: 32, mass: 0.85 },
  /** Press compression. */
  press: { stiffness: 520, damping: 34, mass: 0.7 },
  /** AI button ⇄ composer morph. */
  morph: { stiffness: 380, damping: 33, mass: 0.9 },
  /** Squash-and-settle overshoot as the capsule leaves a slot. */
  travelInMs: 110,
  /** Cross-fade for icon / label state. */
  stateMs: 190,
} as const;

export type GlassLayers = {
  /** Layer 1 — dark translucent base. Skipped when native glass carries it. */
  base: string | null;
  /** Layer 2 — background blur. */
  blurIntensity: number;
  blurTint: BlurTint;
  /** Layer 3 — saturation / brightness lift. */
  lift: string | null;
  /** Layer 4 — internal reflection, top-down. */
  highlight: readonly [string, string];
  /** Layer 7 — optical sheen across the surface. */
  sheen: readonly [string, string, string];
  /** Layer 5 — edge highlight. */
  edge: string;
  edgeTop: string;
  /** Tint handed to the native glass effect. */
  nativeTint: string;
};

export type GlassPalette = {
  /** Bar / composer shell. */
  panel: GlassLayers;
  /** AI button — same family, a touch more present. */
  control: GlassLayers;
  /** Active capsule: a second piece of glass inside the first. */
  capsule: {
    fill: string;
    highlight: readonly [string, string];
    edge: string;
    shadow: ViewStyle;
  };
  /** Layer 6 — ambient shadow under each floating object. */
  shadow: ViewStyle;
  controlShadow: ViewStyle;
  /** Content. No accent colour in the bar: state is carried by the material. */
  iconActive: string;
  iconInactive: string;
  labelActive: string;
  labelInactive: string;
  /** Scrim behind the expanded composer. */
  scrim: string;
};

const dark: GlassPalette = {
  panel: {
    base: 'rgba(34, 36, 44, 0.78)',
    blurIntensity: 26,
    blurTint: 'dark',
    lift: 'rgba(255, 255, 255, 0.035)',
    highlight: ['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0)'],
    sheen: ['rgba(255, 255, 255, 0.055)', 'rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.028)'],
    edge: 'rgba(255, 255, 255, 0.07)',
    edgeTop: 'rgba(255, 255, 255, 0.14)',
    nativeTint: 'rgba(24, 26, 33, 0.5)',
  },
  control: {
    base: 'rgba(38, 40, 49, 0.84)',
    blurIntensity: 30,
    blurTint: 'dark',
    lift: 'rgba(255, 255, 255, 0.055)',
    highlight: ['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0)'],
    sheen: ['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.035)'],
    edge: 'rgba(255, 255, 255, 0.10)',
    edgeTop: 'rgba(255, 255, 255, 0.20)',
    nativeTint: 'rgba(28, 30, 38, 0.42)',
  },
  capsule: {
    fill: 'rgba(255, 255, 255, 0.10)',
    highlight: ['rgba(255, 255, 255, 0.13)', 'rgba(255, 255, 255, 0.01)'],
    edge: 'rgba(255, 255, 255, 0.11)',
    shadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
    },
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 30,
    elevation: 14,
  },
  controlShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 16,
  },
  iconActive: '#ffffff',
  iconInactive: 'rgba(235, 237, 243, 0.56)',
  labelActive: '#ffffff',
  labelInactive: 'rgba(235, 237, 243, 0.52)',
  scrim: 'rgba(6, 7, 10, 0.5)',
};

/**
 * Light scheme is the same construction inverted — the app ships both themes and
 * the bar must not go black on a white background.
 */
const light: GlassPalette = {
  panel: {
    base: 'rgba(248, 249, 252, 0.76)',
    blurIntensity: 32,
    blurTint: 'light',
    lift: 'rgba(255, 255, 255, 0.24)',
    highlight: ['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0)'],
    sheen: ['rgba(255, 255, 255, 0.30)', 'rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.14)'],
    edge: 'rgba(17, 19, 26, 0.08)',
    edgeTop: 'rgba(255, 255, 255, 0.75)',
    nativeTint: 'rgba(250, 251, 253, 0.4)',
  },
  control: {
    base: 'rgba(252, 252, 254, 0.86)',
    blurIntensity: 36,
    blurTint: 'light',
    lift: 'rgba(255, 255, 255, 0.34)',
    highlight: ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0)'],
    sheen: ['rgba(255, 255, 255, 0.38)', 'rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.18)'],
    edge: 'rgba(17, 19, 26, 0.1)',
    edgeTop: 'rgba(255, 255, 255, 0.9)',
    nativeTint: 'rgba(252, 252, 254, 0.34)',
  },
  capsule: {
    fill: 'rgba(255, 255, 255, 0.72)',
    highlight: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.2)'],
    edge: 'rgba(17, 19, 26, 0.06)',
    shadow: {
      shadowColor: '#11131a',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
  },
  shadow: {
    shadowColor: '#11131a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 14,
  },
  controlShadow: {
    shadowColor: '#11131a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 16,
  },
  iconActive: '#11131a',
  iconInactive: 'rgba(17, 19, 26, 0.5)',
  labelActive: '#11131a',
  labelInactive: 'rgba(17, 19, 26, 0.48)',
  scrim: 'rgba(17, 19, 26, 0.28)',
};

const palettes: Record<ColorScheme, GlassPalette> = { light, dark };

export function getGlassPalette(scheme: ColorScheme): GlassPalette {
  return palettes[scheme];
}

/** Hairline that survives both platforms' pixel grids. */
export const glassHairline = tokens.control.hairline;
