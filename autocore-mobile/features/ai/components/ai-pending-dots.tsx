import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, useTheme } from '@/hooks';

/**
 * Wordless pre-reply indicator — Core has not produced a token yet.
 */
export function AiPendingDots() {
  const { colors } = useTheme();
  const motion = useMotion();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Waiting for Autocore"
      style={styles.row}
    >
      <Dot color={colors.mutedForeground} delay={0} reduced={motion.reduced} />
      <Dot color={colors.mutedForeground} delay={120} reduced={motion.reduced} />
      <Dot color={colors.mutedForeground} delay={240} reduced={motion.reduced} />
    </View>
  );
}

function Dot({
  color,
  delay,
  reduced,
}: {
  color: string;
  delay: number;
  reduced: boolean;
}) {
  const opacity = useSharedValue(reduced ? 0.45 : 0.22);

  useEffect(() => {
    if (reduced) {
      opacity.value = 0.45;
      return;
    }
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 380 }), -1, true),
    );
  }, [delay, opacity, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
