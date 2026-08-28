/**
 * Autocore Mobile Design Language v3 — single foundation map.
 * Prefer these tokens over layout.ts / form.ts / cta.ts / feature forks.
 */
import { Platform } from 'react-native';

import { spacing } from './spacing';

/** Corner radius — Apple-adjacent, hierarchy over decoration. */
export const tokens = {
  radius: {
    none: 0,
    control: 10,
    group: 12,
    sheet: 16,
    modal: 20,
    /** Floating dock shell — stadium pill (64h → radius 32). */
    dock: 32,
    full: 9999,
  },
  space: {
    ...spacing,
    screenX: spacing[5], // 20 — Health-like horizontal breathing
    screenY: spacing[3],
    section: spacing[8], // 32 — section rhythm
    stack: spacing[3], // 12
    inline: spacing[2], // 8
    micro: spacing[1], // 4
  },
  control: {
    /** Visual heights — hit target always ≥ 44 via size or hitSlop. */
    heightXs: 28,
    heightSm: 32,
    heightMd: 40,
    heightLg: 48,
    heightXl: 56,
    hitTarget: 44,
    iconVisual: 22,
    iconHit: 44,
    hairline: Platform.select({ ios: 0.33, default: 1 }) ?? 1,
  },
  elevation: {
    /** Shadows only for floating / modal layers. */
    none: 'none' as const,
    floating: 'floating' as const,
    modal: 'modal' as const,
  },
  opacity: {
    disabled: 0.45,
    pressed: 0.88,
    scrim: 0.4,
    hairline: 0.55,
  },
  motion: {
    /** Five critically damped springs — no bounce. */
    springs: {
      press: { damping: 42, stiffness: 520, mass: 0.7 },
      settle: { damping: 36, stiffness: 380, mass: 0.85 },
      sheet: { damping: 40, stiffness: 350, mass: 0.9 },
      list: { damping: 38, stiffness: 420, mass: 0.8 },
      nav: { damping: 36, stiffness: 320, mass: 0.95 },
    },
    duration: {
      instant: 100,
      fast: 180,
      normal: 220,
      medium: 320,
      slow: 420,
    },
  },
  autocomplete: {
    chipPadH: 12,
    chipPadV: 8,
    dockHeight: 56,
    fadeWidth: 36,
    chipMaxWidth: 240,
    staggerMs: 24,
    enterMs: 200,
    maxChips: 8,
  },
} as const;

/** @deprecated Prefer tokens.motion.springs */
export const motionSprings = tokens.motion.springs;

/** @deprecated Prefer tokens.radius */
export const dlRadius = tokens.radius;

/**
 * Spring table for Reanimated / callers that imported `spring` historically.
 * Canonical names only — `snappy`/`gentle`/`default` alias to DL springs.
 */
export const springBridge = {
  press: tokens.motion.springs.press,
  settle: tokens.motion.springs.settle,
  sheet: tokens.motion.springs.sheet,
  list: tokens.motion.springs.list,
  nav: tokens.motion.springs.nav,
  /** @deprecated Use settle */
  default: tokens.motion.springs.settle,
  /** @deprecated Use press */
  snappy: tokens.motion.springs.press,
  /** @deprecated Use settle */
  gentle: tokens.motion.springs.settle,
} as const;
