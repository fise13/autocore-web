import { Easing } from 'react-native-reanimated';

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

export const spring = {
  default: { damping: 32, stiffness: 380, mass: 0.85 },
  snappy: { damping: 28, stiffness: 420, mass: 0.75 },
  gentle: { damping: 36, stiffness: 300, mass: 1 },
  sheet: { damping: 40, stiffness: 350, mass: 0.9 },
} as const;

/** Stagger delay calculator — mirrors motionStagger from web */
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
