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

import { profileSpring } from './profile-timeline';

type ProfileEnterConfig = {
  delay?: number;
  translateY?: number;
  duration?: number;
};

export function useProfileEnter({
  delay = 0,
  translateY = 12,
  duration = 350,
}: ProfileEnterConfig = {}) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const y = useSharedValue(reduced ? 0 : translateY);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: autocoreEase }));
    y.value = withDelay(delay, withSpring(0, profileSpring.press));
  }, [delay, duration, opacity, reduced, y]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
}
