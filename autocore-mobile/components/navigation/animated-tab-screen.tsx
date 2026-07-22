import { useFocusEffect } from 'expo-router';
import { memo, type ReactNode, useCallback } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { autocoreEase, duration } from '@/theme/motion';

import {
  type TabRouteName,
  useTabTransition,
} from './tab-transition-context';

const TAB_ENTER_OFFSET = 8;

type AnimatedTabScreenProps = {
  tab: TabRouteName;
  children: ReactNode;
};

/** Lightweight tab enter — keep motion short so heavy screens stay tappable. */
export const AnimatedTabScreen = memo(function AnimatedTabScreen({
  tab,
  children,
}: AnimatedTabScreenProps) {
  const { takeTransitionFor } = useTabTransition();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      const direction = takeTransitionFor(tab);
      if (reducedMotion || direction === 0) {
        opacity.value = 1;
        translateX.value = 0;
        return;
      }

      const offset = direction * TAB_ENTER_OFFSET;
      opacity.value = 0.96;
      translateX.value = offset;
      opacity.value = withTiming(1, { duration: duration.fast, easing: autocoreEase });
      translateX.value = withTiming(0, { duration: duration.fast, easing: autocoreEase });
    }, [reducedMotion, tab, takeTransitionFor, opacity, translateX]),
  );

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
});

/** Static shell for screens that should paint immediately with zero tab motion cost. */
export const StaticTabScreen = memo(function StaticTabScreen({
  children,
}: {
  children: ReactNode;
}) {
  return <View style={{ flex: 1 }}>{children}</View>;
});
