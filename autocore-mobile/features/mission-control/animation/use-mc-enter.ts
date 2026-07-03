import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

import { mcSpring } from './mc-timeline';

type McEnterConfig = {
  delay?: number;
  translateY?: number;
  translateX?: number;
  scaleFrom?: number;
  duration?: number;
  spring?: boolean;
};

export function useMcEnter({
  delay = 0,
  translateY = 12,
  translateX = 0,
  scaleFrom,
  duration = 340,
  spring = false,
}: McEnterConfig = {}) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const y = useSharedValue(reduced ? 0 : translateY);
  const x = useSharedValue(reduced ? 0 : translateX);
  const scale = useSharedValue(reduced ? 1 : (scaleFrom ?? 1));

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      y.value = 0;
      x.value = 0;
      scale.value = 1;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration, easing: autocoreEase }));

    const yAnim = spring
      ? withSpring(0, mcSpring.enter)
      : withTiming(0, { duration, easing: autocoreEase });
    const xAnim = spring
      ? withSpring(0, mcSpring.enter)
      : withTiming(0, { duration, easing: autocoreEase });

    y.value = withDelay(delay, yAnim);
    x.value = withDelay(delay, xAnim);

    if (scaleFrom !== undefined) {
      scale.value = withDelay(delay, withSpring(1, mcSpring.enter));
    }
  }, [delay, duration, opacity, reduced, scale, scaleFrom, spring, x, y]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { scale: scale.value },
    ],
  }));
}
