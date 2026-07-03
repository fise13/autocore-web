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

import { searchSpring } from './search-timeline';

type SearchEnterConfig = {
  delay?: number;
  translateY?: number;
  scaleFrom?: number;
  duration?: number;
  spring?: boolean;
};

export function useSearchEnter({
  delay = 0,
  translateY = 10,
  scaleFrom,
  duration = 320,
  spring = false,
}: SearchEnterConfig = {}) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const y = useSharedValue(reduced ? 0 : translateY);
  const scale = useSharedValue(reduced ? 1 : (scaleFrom ?? 1));

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      y.value = 0;
      scale.value = 1;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration, easing: autocoreEase }));
    y.value = withDelay(
      delay,
      spring
        ? withSpring(0, searchSpring.enter)
        : withTiming(0, { duration, easing: autocoreEase }),
    );

    if (scaleFrom !== undefined) {
      scale.value = withDelay(delay, withSpring(1, searchSpring.enter));
    }
  }, [delay, duration, opacity, reduced, scale, scaleFrom, spring, y]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));
}
