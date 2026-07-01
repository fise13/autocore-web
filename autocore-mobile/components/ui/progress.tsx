import { View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { autocoreEase, duration, radius } from '@/theme';

type ProgressProps = ViewProps & {
  value: number;
  max?: number;
};

export function Progress({ value, max = 100, style, ...props }: ProgressProps) {
  const { colors } = useTheme();
  const percent = Math.min(Math.max(value / max, 0), 1);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: withTiming(percent, { duration: duration.progress, easing: autocoreEase }),
      },
    ],
  }));

  return (
    <View
      style={[
        {
          height: 6,
          borderRadius: radius.full,
          backgroundColor: colors.muted,
          overflow: 'hidden',
        },
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            width: '100%',
            borderRadius: radius.full,
            backgroundColor: colors.primary,
            transformOrigin: 'left center',
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
