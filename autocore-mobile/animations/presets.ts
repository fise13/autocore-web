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
import { useEffect } from 'react';

import { useReducedMotion } from '@/hooks';
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
  const opacity = useSharedValue(1);
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      y.value = 0;
      x.value = 0;
      scale.value = 1;
      return;
    }

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
  }, [delay, duration, fade, opacity, reduced, scale, scaleFrom, translateX, translateY, useSpringMotion, x, y]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { translateX: x.value }, { scale: scale.value }],
  }));
}

export function useFadeIn(delayMs = 0, config: { duration: number; easing: typeof autocoreEase } = motionTiming.slow) {
  const reduced = useReducedMotion() || !screenMotion.enabled;
  const opacity = useSharedValue<number>(1);
  const translateY = useSharedValue<number>(0);

  const animDuration = reduced ? duration.instant : config.duration;
  const easing = config.easing;

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = 0;
    translateY.value = enterValues.fadeInUp.translateY[0];
    opacity.value = withDelay(delayMs, withTiming(1, { duration: animDuration, easing }));
    translateY.value = withDelay(
      delayMs,
      withTiming(enterValues.fadeInUp.translateY[1], { duration: animDuration, easing }),
    );
  }, [animDuration, delayMs, easing, opacity, reduced, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { style, opacity, translateY };
}

export function usePressAnimation(scale: number = cardPress.scale) {
  const pressed = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const onPressIn = () => {
    pressed.value = withTiming(scale, { duration: cardPress.duration, easing: autocoreEase });
  };

  const onPressOut = () => {
    pressed.value = withSpring(1, spring.snappy);
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
