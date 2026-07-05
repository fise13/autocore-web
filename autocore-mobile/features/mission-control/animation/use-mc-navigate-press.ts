import { useCallback } from 'react';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

export function useMcNavigatePress(onNavigate: () => void) {
  const reducedMotion = useReducedMotion();
  const exitProgress = useSharedValue(1);

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitProgress.value,
    transform: [{ scale: 0.985 + exitProgress.value * 0.015 }],
  }));

  const press = useCallback(() => {
    if (reducedMotion) {
      onNavigate();
      return;
    }
    exitProgress.value = withTiming(0.86, { duration: 130, easing: autocoreEase }, (finished) => {
      if (finished) {
        runOnJS(onNavigate)();
        exitProgress.value = 1;
      }
    });
  }, [exitProgress, onNavigate, reducedMotion]);

  return { exitStyle, press };
}
