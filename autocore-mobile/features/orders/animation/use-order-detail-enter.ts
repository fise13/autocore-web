import { useScreenEnter } from '@/animations';
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
import { rhythm, screenMotion } from '@/theme/screen';

export function useOrderDetailHeroEnter(delay = 0) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const scale = useSharedValue(reduced ? 1 : 0.96);
  const radius = useSharedValue(reduced ? rhythm.cardRadius : rhythm.cardRadius);
  const translateY = useSharedValue(reduced ? 0 : screenMotion.translateY);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      scale.value = 1;
      radius.value = rhythm.cardRadius;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: screenMotion.duration, easing: autocoreEase }),
    );
    scale.value = withDelay(delay, withSpring(1, screenMotion.spring));
    radius.value = rhythm.cardRadius;
    translateY.value = withDelay(delay, withSpring(0, screenMotion.spring));
  }, [delay, opacity, radius, reduced, scale, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    borderRadius: radius.value,
  }));
}

export function useOrderDetailContentEnter(delay = screenMotion.stagger * 3) {
  return useScreenEnter({ delay, translateY: screenMotion.translateY });
}
