import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useEffect, useRef } from 'react';

import { useReducedMotion } from '@/hooks/use-accessibility';
import { tokens } from '@/theme/tokens';
import {
  autocoreEase,
  cardPress,
  cardLift,
  duration,
  enterValues,
  motionTiming,
  skeletonPulse,
  spring,
  staggerDelay,
} from '@/theme/motion';

/**
 * Fading in must outrun the eye and fading out must not linger: a slow release
 * is what made the old version feel like the tap had not registered.
 */
const PRESS_FADE_IN = { duration: 60, easing: autocoreEase } as const;
const PRESS_FADE_OUT = { duration: 140, easing: autocoreEase } as const;
import { screenMotion } from '@/theme/screen';

type ScreenEnterConfig = {
  delay?: number;
  translateY?: number;
  translateX?: number;
  scaleFrom?: number;
  duration?: number;
  spring?: boolean;
  /** Skip animation (list recycling / offscreen rows) */
  enabled?: boolean;
  /**
   * Fade from 0→1. Default false for titles/body copy so dark-theme text
   * never gets stuck at low opacity (freezeOnBlur / interrupted animations).
   */
  fade?: boolean;
};

/** Single enter animation for all feature screens */
export function useScreenEnter({
  delay = 0,
  translateY = screenMotion.translateY,
  translateX = 0,
  scaleFrom,
  duration = screenMotion.duration,
  spring: useSpringMotion = false,
  enabled = true,
  fade = false,
}: ScreenEnterConfig = {}) {
  const reduced = useReducedMotion() || !enabled || !screenMotion.enabled;
  const settled = useSharedValue(reduced ? 1 : 0);
  const opacity = useSharedValue(1);
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const scale = useSharedValue(1);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      settled.value = 1;
      opacity.value = 1;
      y.value = 0;
      x.value = 0;
      scale.value = 1;
      return;
    }

    if (startedRef.current) {
      settled.value = 1;
      opacity.value = 1;
      y.value = 0;
      x.value = 0;
      scale.value = 1;
      return;
    }
    startedRef.current = true;

    opacity.value = fade ? 0 : 1;
    y.value = translateY;
    x.value = translateX;
    scale.value = scaleFrom ?? 1;

    if (fade) {
      opacity.value = withDelay(delay, withTiming(1, { duration, easing: autocoreEase }));
    }

    const settle = useSpringMotion
      ? (to: number) => withSpring(to, screenMotion.spring)
      : (to: number) => withTiming(to, { duration, easing: autocoreEase });

    y.value = withDelay(delay, settle(0));
    x.value = withDelay(delay, settle(0));

    if (scaleFrom !== undefined) {
      scale.value = withDelay(delay, withTiming(1, { duration, easing: autocoreEase }));
    }

    const settleMs = delay + Math.max(duration, 420) + 48;
    const timer = setTimeout(() => {
      settled.value = 1;
      opacity.value = 1;
      y.value = 0;
      x.value = 0;
      scale.value = 1;
    }, settleMs);
    return () => clearTimeout(timer);
  }, [
    delay,
    duration,
    fade,
    opacity,
    reduced,
    scale,
    scaleFrom,
    settled,
    translateX,
    translateY,
    useSpringMotion,
    x,
    y,
  ]);

  return useAnimatedStyle(() => {
    if (settled.value === 1) {
      return {};
    }
    return {
      opacity: opacity.value,
      transform: [{ translateY: y.value }, { translateX: x.value }, { scale: scale.value }],
    };
  });
}

export function useFadeIn(
  delayMs = 0,
  config: { duration: number; easing: typeof autocoreEase } = motionTiming.slow,
) {
  const reduced = useReducedMotion() || !screenMotion.enabled;
  /** Negative delay = animation disabled (callers use this for animateEnter={false}). */
  const disabled = reduced || delayMs < 0;
  const settled = useSharedValue(disabled ? 1 : 0);
  const opacity = useSharedValue<number>(1);
  const translateY = useSharedValue<number>(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (disabled) {
      settled.value = 1;
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    // Run once — Strict Mode cleanup must not leave opacity stuck at 0.
    if (startedRef.current) {
      if (settled.value !== 1) {
        settled.value = 1;
        opacity.value = 1;
        translateY.value = 0;
      }
      return;
    }
    startedRef.current = true;

    opacity.value = 0;
    translateY.value = enterValues.fadeInUp.translateY[0];
    opacity.value = withDelay(delayMs, withTiming(1, { duration: config.duration, easing: config.easing }));
    translateY.value = withDelay(
      delayMs,
      withTiming(enterValues.fadeInUp.translateY[1], {
        duration: config.duration,
        easing: config.easing,
      }),
    );

    const settleMs = delayMs + config.duration + 48;
    const timer = setTimeout(() => {
      settled.value = 1;
      opacity.value = 1;
      translateY.value = 0;
    }, settleMs);
    return () => clearTimeout(timer);
  }, [config.duration, config.easing, delayMs, disabled, opacity, settled, translateY]);

  const style = useAnimatedStyle(() => {
    if (settled.value === 1) {
      return {};
    }
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return { style, opacity, translateY };
}

/**
 * Press feedback for a card or tile.
 *
 * This was a no-op for a while — it returned an undefined style and two empty
 * handlers — because the original spring-scale version contended with
 * NativeTabs and sheet gestures and read as tap lag. The stub fixed the lag and
 * quietly took the feedback with it: five surfaces went on wiring up
 * `onPressIn`/`onPressOut` and passing `style` to an `Animated.View`, and none
 * of them responded to touch at all.
 *
 * Opacity rather than scale is what makes it safe to switch back on. A scale
 * spring animates layout, competes with the gesture recognisers above it, and
 * keeps running after the finger leaves; opacity is a compositor-only property
 * with a fixed, short timing, so there is nothing left in flight for the tab
 * bar or a sheet to fight with.
 *
 * `scale` is accepted for call-site compatibility and deliberately unused —
 * see above for why nothing here scales.
 */
export function usePressAnimation(_scale: number = cardPress.scale) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * (1 - tokens.opacity.pressed),
  }));

  const onPressIn = () => {
    pressed.value = reduced ? 1 : withTiming(1, PRESS_FADE_IN);
  };

  const onPressOut = () => {
    pressed.value = reduced ? 0 : withTiming(0, PRESS_FADE_OUT);
  };

  return { style, onPressIn, onPressOut, pressed };
}

export function useStaggerFadeIn(index: number, baseMs = 55) {
  return useFadeIn(staggerDelay(index, baseMs));
}

export function usePageEnter() {
  return useFadeIn(0, motionTiming.medium);
}

export function useShake(trigger: SharedValue<number>) {
  const translateX = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const shake = () => {
    translateX.value = withSequence(
      withTiming(-2, { duration: 70 }),
      withTiming(2, { duration: 70 }),
      withTiming(-2, { duration: 70 }),
      withTiming(2, { duration: 70 }),
      withTiming(0, { duration: 70 }),
    );
    trigger.value = trigger.value + 1;
  };

  return { style, shake };
}

export function useShimmer(active = true) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active && !reduced) {
      progress.value = withRepeat(
        withTiming(1, { duration: skeletonPulse.duration, easing: skeletonPulse.easing }),
        -1,
        false,
      );
      return;
    }

    progress.value = withTiming(0, { duration: duration.fast, easing: motionTiming.fast.easing });
  }, [active, progress, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: skeletonPulse.minOpacity + progress.value * (skeletonPulse.maxOpacity - skeletonPulse.minOpacity),
  }));

  return { style, progress };
}

export function useScaleEnter(delayMs = 0) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue<number>(0);
  const scale = useSharedValue<number>(enterValues.authCard.scale[0]);

  const animDuration = reduced ? duration.fast : duration.slow;

  useEffect(() => {
    opacity.value = withDelay(delayMs, withTiming(1, { duration: animDuration, easing: motionTiming.slow.easing }));
    scale.value = withDelay(
      delayMs,
      withTiming(reduced ? 1 : enterValues.authCard.scale[1], { duration: animDuration, easing: motionTiming.slow.easing }),
    );
  }, [animDuration, delayMs, opacity, reduced, scale]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
}

export function useCardLift() {
  const reduced = useReducedMotion();
  const translateY = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const onPressIn = () => {
    if (reduced) return;
    translateY.value = withTiming(cardLift.translateY, { duration: cardLift.duration, easing: cardLift.easing });
  };

  const onPressOut = () => {
    translateY.value = withTiming(0, { duration: cardLift.duration, easing: cardLift.easing });
  };

  return { style, onPressIn, onPressOut };
}

export { withTiming, withSpring, withDelay, withSequence, withRepeat };
