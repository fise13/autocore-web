import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useReducedMotion } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

import { mcMotion } from './mc-motion';

type McEnterConfig = {
  delay?: number;
  translateY?: number;
  translateX?: number;
  scaleFrom?: number;
  duration?: number;
  spring?: boolean;
  fade?: boolean;
};

export function useMcEnter({
  delay = 0,
  translateY = mcMotion.translateY,
  translateX = 0,
  scaleFrom,
  duration = mcMotion.duration,
  spring: useSpringMotion = true,
  fade = false,
}: McEnterConfig = {}) {
  const reduced = useReducedMotion() || !mcMotion.enabled;
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
      ? (to: number) => withSpring(to, mcMotion.spring)
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
