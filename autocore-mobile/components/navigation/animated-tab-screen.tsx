import { useCallback, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

import {
  type TabRouteName,
  TabEntryProvider,
  useTabTransition,
} from './tab-transition-context';

/** Fast tab switch — not the cinematic first-open sequence */
const tabSpring = { damping: 26, stiffness: 480, mass: 0.7 };

type AnimatedTabScreenProps = {
  tab: TabRouteName;
  children: ReactNode;
};

export function AnimatedTabScreen({ tab, children }: AnimatedTabScreenProps) {
  const reduced = useReducedMotion();
  const { takeTransitionFor, markFocused } = useTabTransition();
  const [entryDirection, setEntryDirection] = useState(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      markFocused(tab);
      const direction = takeTransitionFor(tab);
      setEntryDirection(direction);

      if (!reduced && direction !== 0) {
        translateX.value = direction * 12;
        opacity.value = 0.97;
        translateX.value = withSpring(0, tabSpring);
        opacity.value = withTiming(1, { duration: 180, easing: autocoreEase });
      } else if (!reduced) {
        translateX.value = 0;
        opacity.value = 1;
      }

      return undefined;
    }, [markFocused, opacity, reduced, tab, takeTransitionFor, translateX]),
  );

  const screenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1 }, screenStyle]}>
        <TabEntryProvider direction={entryDirection}>{children}</TabEntryProvider>
      </Animated.View>
    </View>
  );
}
