import { memo, useCallback, type ReactNode } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import { type TabRouteName, useTabTransition } from './tab-transition-context';

/** Horizontal travel on tab enter — small so content stays readable. */
const TAB_ENTER_OFFSET = 18;

type AnimatedTabScreenProps = {
  tab: TabRouteName;
  children: ReactNode;
};

/**
 * Tab content enter — translate only (no parent opacity).
 * Opacity on this shell previously blanked nested Reanimated text/counters.
 * Outer clip + canvas fill so the slide never flashes the navigator’s default white.
 */
export const AnimatedTabScreen = memo(function AnimatedTabScreen({
  tab,
  children,
}: AnimatedTabScreenProps) {
  const { takeTransitionFor } = useTabTransition();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: translateX.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      const direction = takeTransitionFor(tab);
      if (reducedMotion || direction === 0) {
        translateX.value = 0;
        return;
      }

      translateX.value = direction * TAB_ENTER_OFFSET;
      translateX.value = withSpring(0, tokens.motion.springs.nav);
    }, [reducedMotion, tab, takeTransitionFor, translateX]),
  );

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: colors.background,
      }}
    >
      <Animated.View style={[animatedStyle, { backgroundColor: colors.background }]}>
        {children}
      </Animated.View>
    </View>
  );
});

/** Static shell for immersive screens (scan) that should paint with zero tab motion. */
export const StaticTabScreen = memo(function StaticTabScreen({
  children,
}: {
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>;
});
