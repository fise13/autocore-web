import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { useShimmer } from '@/animations';
import { radius } from '@/theme';

type SkeletonProps = ViewProps & {
  width?: number | `${number}%`;
  height?: number;
  rounded?: keyof typeof radius;
};

export function Skeleton({ width = '100%', height = 16, rounded = 'md', style, ...props }: SkeletonProps) {
  const { colors } = useTheme();
  const { style: shimmerStyle } = useShimmer();

  return (
    <Animated.View
      style={[
        shimmerStyle,
        {
          width,
          height,
          borderRadius: radius[rounded],
          backgroundColor: colors.muted,
        },
        style,
      ]}
      {...props}
    />
  );
}
