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

import { scanSpring } from './scan-timeline';

type ScanEnterConfig = {
  delay?: number;
  translateY?: number;
  scaleFrom?: number;
  duration?: number;
};

export function useScanEnter({
  delay = 0,
  translateY = 14,
  scaleFrom,
  duration = 320,
}: ScanEnterConfig = {}) {
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
    y.value = withDelay(delay, withSpring(0, scanSpring.panel));
    if (scaleFrom !== undefined) {
      scale.value = withDelay(delay, withSpring(1, scanSpring.panel));
    }
  }, [delay, duration, opacity, reduced, scale, scaleFrom, y]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));
}
