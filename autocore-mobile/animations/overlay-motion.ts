/**
 * Overlay motion — one vocabulary for every surface that appears above the app:
 * dropdowns, context menus, dialogs, sheets, toasts.
 *
 * Bound to DL v3 springs: settle (menus/dialogs), sheet (travel), press unused here.
 * Exits stay short timing — leaving is never as interesting as arriving.
 */
import { withSpring, withTiming, Easing } from 'react-native-reanimated';
import type {
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ExitAnimationsValues,
} from 'react-native-reanimated';

import { tokens } from '@/theme/tokens';

const SETTLE = tokens.motion.springs.settle;
const SHEET = tokens.motion.springs.sheet;

const ENTER_FADE = { duration: tokens.motion.duration.fast, easing: Easing.bezier(0.22, 1, 0.36, 1) } as const;
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
 * anchor so the menu reads as growing out of the control it belongs to.
 */
export const popoverIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: -4 }] },
    animations: {
      opacity: withTiming(1, ENTER_FADE),
      transform: [
        { scale: withSpring(1, SETTLE) },
        { translateY: withSpring(0, SETTLE) },
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
      transform: [{ scale: withSpring(1, SETTLE) }],
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

/** Bottom sheets: travel their own height on the sheet spring. */
export const sheetIn: EntryExitAnimationFunction = ((targetValues: EntryAnimationsValues) => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: targetValues.targetHeight }] },
    animations: { transform: [{ translateY: withSpring(0, SHEET) }] },
  };
}) as EntryExitAnimationFunction;

export const sheetOut: EntryExitAnimationFunction = ((values: ExitAnimationsValues) => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: 200, easing: Easing.bezier(0.4, 0, 1, 1) }),
      transform: [
        {
          translateY: withTiming(values.currentHeight, {
            duration: 220,
            easing: Easing.bezier(0.4, 0, 1, 1),
          }),
        },
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
        { translateY: withSpring(0, SETTLE) },
        { scale: withSpring(1, SETTLE) },
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
