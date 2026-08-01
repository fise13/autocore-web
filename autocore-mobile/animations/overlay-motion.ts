/**
 * Overlay motion — one vocabulary for every surface that appears above the app:
 * dropdowns, context menus, dialogs, sheets, toasts.
 *
 * The feel is Apple/Linear: surfaces come in on a spring that settles without
 * visible bounce, and leave on a short curve — leaving is never as interesting
 * as arriving, so exits are ~40% of the enter duration.
 *
 * These are Reanimated custom entering/exiting builders; every function body is
 * a worklet and runs on the UI thread.
 */
import { withSpring, withTiming, Easing } from 'react-native-reanimated';
import type {
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
} from 'react-native-reanimated';

/** Settles in ~260ms with no perceptible overshoot. */
const SURFACE_SPRING = { damping: 26, stiffness: 320, mass: 0.7 } as const;
/** Slightly softer — used where the surface travels a longer distance. */
const TRAVEL_SPRING = { damping: 30, stiffness: 260, mass: 0.85 } as const;

const ENTER_FADE = { duration: 170, easing: Easing.bezier(0.22, 1, 0.36, 1) } as const;
const EXIT_FADE = { duration: 120, easing: Easing.bezier(0.4, 0, 1, 1) } as const;

/** Backdrop: fades only, never scales — it must not read as a moving object. */
export const backdropIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0 },
    animations: { opacity: withTiming(1, ENTER_FADE) },
  };
};

export const backdropOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1 },
    animations: { opacity: withTiming(0, EXIT_FADE) },
  };
};

/**
 * Anchored surfaces (dropdown menus, context menus): a small scale-up from the
 * anchor's scale, so the menu reads as growing out of the control it belongs to.
 */
export const popoverIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: -4 }] },
    animations: {
      opacity: withTiming(1, ENTER_FADE),
      transform: [
        { scale: withSpring(1, SURFACE_SPRING) },
        { translateY: withSpring(0, SURFACE_SPRING) },
      ],
    },
  };
};

export const popoverOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
    animations: {
      opacity: withTiming(0, EXIT_FADE),
      transform: [
        { scale: withTiming(0.96, EXIT_FADE) },
        { translateY: withTiming(-2, EXIT_FADE) },
      ],
    },
  };
};

/** Centred dialogs: scale up from just under full size, like an iOS alert. */
export const dialogIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.92 }] },
    animations: {
      opacity: withTiming(1, ENTER_FADE),
      transform: [{ scale: withSpring(1, SURFACE_SPRING) }],
    },
  };
};

export const dialogOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, EXIT_FADE),
      transform: [{ scale: withTiming(0.96, EXIT_FADE) }],
    },
  };
};

/** Bottom sheets: travel their own height, so they get the softer spring. */
export const sheetIn: EntryExitAnimationFunction = ((targetValues: EntryAnimationsValues) => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: targetValues.targetHeight }] },
    animations: { transform: [{ translateY: withSpring(0, TRAVEL_SPRING) }] },
  };
}) as EntryExitAnimationFunction;

export const sheetOut: EntryExitAnimationFunction = ((values: ExitAnimationsValues) => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: 200, easing: Easing.bezier(0.4, 0, 1, 1) }),
      transform: [
        { translateY: withTiming(values.currentHeight, { duration: 220, easing: Easing.bezier(0.4, 0, 1, 1) }) },
      ],
    },
  };
}) as EntryExitAnimationFunction;

/** Toasts: rise slightly and settle — noticeable without stealing focus. */
export const toastIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 18 }, { scale: 0.97 }] },
    animations: {
      opacity: withTiming(1, ENTER_FADE),
      transform: [
        { translateY: withSpring(0, TRAVEL_SPRING) },
        { scale: withSpring(1, TRAVEL_SPRING) },
      ],
    },
  };
};

export const toastOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, EXIT_FADE),
      transform: [
        { translateY: withTiming(12, EXIT_FADE) },
        { scale: withTiming(0.98, EXIT_FADE) },
      ],
    },
  };
};
