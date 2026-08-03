import { Pressable } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 24;
const THUMB_INSET = 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2;

/**
 * Quiet Claude-like switch — timing (not spring) so the thumb never overshoots.
 */
export function Switch({ value, onValueChange, disabled }: SwitchProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: motion.reduced ? 80 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [motion.reduced, progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.input, colors.primary]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: THUMB_INSET + progress.value * THUMB_TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.toggle();
        onValueChange(!value);
      }}
      style={{ opacity: disabled ? 0.5 : 1 }}
      hitSlop={6}
    >
      <Animated.View
        style={[
          {
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            justifyContent: 'center',
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: colors.primaryForeground,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
