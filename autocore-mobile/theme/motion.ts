/**
 * Autocore Motion System — iOS-quality Reanimated presets.
 * All animations respect reduced motion via useReducedMotion hook.
 */
import {
  Easing,
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeOutUp,
  SlideInRight,
  SlideOutRight,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  LinearTransition,
} from 'react-native-reanimated';

import {
  autocoreEase,
  smoothEase,
  duration,
  spring,
  staggerDelay,
  enterValues,
} from './animations';
import { sheetTransition, pageTransition, modalTransition } from './design-language';

export { autocoreEase, smoothEase, duration, spring, staggerDelay, enterValues };

/** Reanimated entering animation — use `as const` builders from reanimated */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MotionAnimation = any;

/** Core timing config */
export const motionTiming = {
  instant: { duration: duration.instant, easing: smoothEase },
  fast: { duration: duration.fast, easing: autocoreEase },
  normal: { duration: duration.normal, easing: autocoreEase },
  medium: { duration: duration.medium, easing: autocoreEase },
  slow: { duration: duration.slow, easing: autocoreEase },
} as const;

/** Reduced motion fallback — opacity only */
export const reducedMotion = {
  entering: FadeIn.duration(duration.fast),
  exiting: FadeOut.duration(duration.instant),
} as const;

function withReduced(full: MotionAnimation, reduced: MotionAnimation = reducedMotion.entering) {
  return { full, reduced };
}

/** Page transitions */
export const pagePush = withReduced(
  SlideInRight.duration(pageTransition.duration).easing(autocoreEase),
);
export const pagePop = withReduced(
  SlideOutRight.duration(pageTransition.duration).easing(autocoreEase),
);
export const pageFade = withReduced(
  FadeIn.duration(pageTransition.duration).easing(autocoreEase),
);

/** Card interactions */
export const cardLift = {
  translateY: -1,
  duration: duration.normal,
  easing: autocoreEase,
} as const;

export const cardPress = {
  scale: 0.98,
  duration: duration.fast,
  spring: spring.snappy,
} as const;

/** Hero / auth transitions */
export const heroTransition = withReduced(
  FadeInUp.duration(duration.slow)
    .easing(autocoreEase)
    .springify()
    .damping(spring.gentle.damping)
    .stiffness(spring.gentle.stiffness),
);

/** FAB */
export const fabEnter = withReduced(
  ZoomIn.duration(duration.medium).easing(autocoreEase).springify().damping(spring.snappy.damping),
);
export const fabExit = FadeOut.duration(duration.fast);

/** Bottom sheet */
export const sheetEnter = withReduced(
  SlideInDown.duration(sheetTransition.duration)
    .easing(autocoreEase)
    .springify()
    .damping(sheetTransition.spring.damping)
    .stiffness(sheetTransition.spring.stiffness),
);
export const sheetExit = SlideOutDown.duration(sheetTransition.duration).easing(autocoreEase);

/** Dialog / modal */
export const dialogEnter = withReduced(
  ZoomIn.duration(modalTransition.duration)
    .easing(autocoreEase)
    .springify()
    .damping(spring.default.damping),
);
export const dialogExit = ZoomOut.duration(duration.fast).easing(autocoreEase);
export const dialogBackdropEnter = FadeIn.duration(duration.fast);
export const dialogBackdropExit = FadeOut.duration(duration.instant);

/** Toast */
export const toastEnter = withReduced(
  FadeInUp.duration(duration.medium).easing(autocoreEase),
);
export const toastExit = FadeOutUp.duration(duration.fast);

/** Search expand */
export const searchExpand = {
  duration: duration.medium,
  easing: autocoreEase,
  widthScale: 1,
} as const;

/** Pull to refresh */
export const pullToRefresh = {
  threshold: 80,
  duration: duration.medium,
  easing: autocoreEase,
} as const;

/** Navigation tab */
export const navigationTab = withReduced(
  FadeIn.duration(duration.fast).easing(smoothEase),
);

/** Shared element placeholder */
export const sharedElement = {
  duration: duration.medium,
  easing: autocoreEase,
} as const;

/** List stagger */
export const listStagger = {
  baseMs: 55,
  itemEnter: FadeInUp.duration(duration.medium).easing(autocoreEase),
  layout: LinearTransition.duration(duration.normal).easing(autocoreEase),
} as const;

/** Skeleton shimmer */
export const skeletonPulse = {
  duration: 1200,
  easing: Easing.linear,
  minOpacity: 0.4,
  maxOpacity: 0.8,
} as const;

/** Loading spinner */
export const loadingFade = FadeIn.duration(duration.fast);

/** Mission control / auth legacy tokens */
export const mcMotion = {
  ease: [0.22, 1, 0.36, 1] as const,
  page: { staggerChildren: 60, delayChildren: 40 },
  section: { duration: 380, translateY: 10 },
  card: { duration: 420, translateY: 14 },
  kpi: { staggerChildren: 45, delayChildren: 20 },
  kpiItem: { duration: 320, translateY: 8, scale: [0.98, 1] },
} as const;

export const pressMotion = cardPress;
export const cardLiftMotion = cardLift;
export const listMotion = { staggerMs: listStagger.baseMs, itemDuration: duration.medium };
export const sheetMotion = {
  snapDuration: sheetTransition.duration,
  backdropDuration: sheetTransition.backdropDuration,
};
export const navigationMotion = {
  duration: pageTransition.duration,
  translateX: 20,
};

/** Pick animation based on reduced motion preference */
export function pickMotion(
  preset: ReturnType<typeof withReduced>,
  reduced: boolean,
): MotionAnimation {
  return reduced ? preset.reduced : preset.full;
}
