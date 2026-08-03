import type { ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { useShimmer } from '@/animations';
import { radius } from '@/theme/radius';
import { tokens } from '@/theme/tokens';

type SkeletonProps = ViewProps & {
  width?: number | `${number}%`;
  height?: number;
  /** Legacy radius keys or DL tokens.radius keys. */
  rounded?: keyof typeof radius | keyof typeof tokens.radius;
};

function resolveRadius(rounded: SkeletonProps['rounded']): number {
  if (!rounded) return tokens.radius.control;
  if (rounded in tokens.radius) {
    return tokens.radius[rounded as keyof typeof tokens.radius];
  }
  return radius[rounded as keyof typeof radius] ?? tokens.radius.control;
}

/**
 * Structure-preserving shimmer block — compose into Collection / form skeletons.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = 'control',
  style,
  ...props
}: SkeletonProps) {
  const { colors } = useTheme();
  const { style: shimmerStyle } = useShimmer();

  return (
    <Animated.View
      style={[
        shimmerStyle,
        {
          width,
          height,
          borderRadius: resolveRadius(rounded),
          backgroundColor: colors.muted,
        },
        style,
      ]}
      {...props}
    />
  );
}
