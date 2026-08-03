import { Easing } from 'react-native-reanimated';

import { tokens } from './tokens';

/** Autocore easing — cubic-bezier(0.22, 1, 0.36, 1) from globals.css */
export const autocoreEase = Easing.bezier(0.22, 1, 0.36, 1);

/** Secondary ease from desktop tokens */
export const smoothEase = Easing.bezier(0.16, 1, 0.3, 1);

export const duration = {
  instant: 100,
  fast: 180,
  normal: 220,
  medium: 320,
  slow: 420,
  page: 380,
  bar: 720,
  progress: 850,
  pulse: 2000,
  sidebar: 650,
} as const;

/**
 * DL v3 spring table — five critically damped springs.
 * `snappy` / `gentle` / `default` are deprecated aliases (press / settle).
 */
export const spring = {
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

/** Stagger delay — prefer not using for list remounts (DL v3). */
export function staggerDelay(index: number, baseMs = 55): number {
  return index * baseMs;
}

/** Animation presets mapped from globals.css keyframes */
export const presets = {
  fadeIn: { duration: duration.fast, easing: smoothEase },
  fadeInUp: { duration: duration.slow, easing: autocoreEase },
  tabEnter: { duration: duration.medium, easing: autocoreEase },
  pageEnter: { duration: duration.page, easing: autocoreEase },
  barGrow: { duration: duration.bar, easing: autocoreEase },
  progressGrow: { duration: duration.progress, easing: autocoreEase },
  logoEnter: { duration: 500, easing: autocoreEase },
  authCardEnter: { duration: 480, easing: autocoreEase },
  authStagger: { duration: 380, easing: autocoreEase },
  authFormEnter: { duration: duration.medium, easing: autocoreEase },
  gridEnter: { duration: 180, easing: Easing.out(Easing.ease) },
  shake: { duration: 350, easing: Easing.inOut(Easing.ease) },
  press: { duration: duration.fast, easing: autocoreEase },
  cardLift: { duration: duration.normal, easing: autocoreEase },
} as const;

/** Enter animation values from lib/motion */
export const enterValues = {
  page: { opacity: [0, 1], translateY: [8, 0] },
  panel: { opacity: [0, 1], translateY: [6, 0] },
  fadeInUp: { opacity: [0, 1] as const, translateY: [10, 0] as const },
  tabEnter: { opacity: [0, 1] as const, translateY: [6, 0] as const },
  authCard: { opacity: [0, 1] as const, translateY: [14, 0] as const, scale: [0.98, 1] as const },
  logo: { opacity: [0, 1] as const, translateY: [6, 0] as const, scale: [0.92, 1] as const },
  mcCard: { opacity: [0, 1], translateY: [14, 0] },
  mcKpi: { opacity: [0, 1], translateY: [8, 0], scale: [0.98, 1] },
} as const;
