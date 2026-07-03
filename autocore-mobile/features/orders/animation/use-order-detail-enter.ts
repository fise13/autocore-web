import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';

import { ordersSpring } from './orders-timeline';

export function useOrderDetailHeroEnter(delay = 0) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const scale = useSharedValue(reduced ? 1 : 0.94);
  const radius = useSharedValue(reduced ? 0 : 18);
  const translateY = useSharedValue(reduced ? 0 : 18);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      scale.value = 1;
      radius.value = 0;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withSpring(1, ordersSpring.hero));
    radius.value = withDelay(delay + 40, withSpring(0, ordersSpring.hero));
    translateY.value = withDelay(delay, withSpring(0, ordersSpring.hero));
  }, [delay, opacity, radius, reduced, scale, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    borderRadius: radius.value,
  }));
}

export function useOrderDetailContentEnter(delay = 120) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateY = useSharedValue(reduced ? 0 : 14);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withSpring(0, ordersSpring.hero));
  }, [delay, opacity, reduced, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}
