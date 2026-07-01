import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import Animated, { useAnimatedProps, useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';

import { useDesignLanguage } from '@/hooks';
import { iconSizes, type IconSize } from '@/theme/icons';
import { duration, autocoreEase } from '@/theme/motion';

const AnimatedIconWrapper = Animated.createAnimatedComponent(Animated.View);

export type IconState = 'default' | 'active' | 'disabled';

export type IconProps = {
  size?: IconSize | number;
  color?: string;
  strokeWidth?: number;
  /** Outlined (default) vs filled appearance */
  variant?: 'outlined' | 'filled';
  state?: IconState;
  animated?: boolean;
  animatedOpacity?: SharedValue<number>;
  accessibilityLabel?: string;
};

export function createIcon(IconComponent: LucideIcon, displayName?: string) {
  const Icon = memo(function Icon({
    size = 'md',
    color,
    strokeWidth,
    variant = 'outlined',
    state = 'default',
    animatedOpacity,
    accessibilityLabel,
  }: IconProps) {
    const dl = useDesignLanguage();
    const dimension = typeof size === 'number' ? size : iconSizes[size];

    const resolvedColor = (() => {
      if (color) return color;
      if (state === 'disabled') return dl.colors.mutedForeground;
      if (state === 'active') return dl.colors.primary;
      return dl.colors.foreground;
    })();

    const resolvedStroke =
      strokeWidth ?? (variant === 'filled' ? dl.iconWeight.strokeBold : dl.iconWeight.stroke);

    const opacity = state === 'disabled' ? 0.45 : 1;

    const animatedStyle = useAnimatedStyle(() => {
      if (!animatedOpacity) return { opacity };
      return {
        opacity: animatedOpacity.value * opacity,
      };
    }, [opacity]);

    const icon = (
      <IconComponent
        width={dimension}
        height={dimension}
        color={resolvedColor}
        strokeWidth={resolvedStroke}
        fill={variant === 'filled' ? resolvedColor : 'none'}
        accessibilityLabel={accessibilityLabel}
      />
    );

    if (animatedOpacity) {
      return (
        <AnimatedIconWrapper style={[{ width: dimension, height: dimension }, animatedStyle]}>
          {icon}
        </AnimatedIconWrapper>
      );
    }

    return icon;
  });

  Icon.displayName = displayName ?? IconComponent.displayName ?? 'Icon';
  return Icon;
}

/** Animate icon color/state change */
export function useIconPulse(active: SharedValue<number>) {
  return useAnimatedProps(() => ({
    opacity: withTiming(active.value ? 1 : 0.6, { duration: duration.fast, easing: autocoreEase }),
  }));
}
