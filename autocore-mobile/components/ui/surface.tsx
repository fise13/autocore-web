import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

export type SurfaceVariant = 'plain' | 'grouped' | 'inset' | 'elevated';

type SurfaceProps = ViewProps & {
  children: ReactNode;
  variant?: SurfaceVariant;
  /** @deprecated Use variant="inset" */
  inset?: boolean;
  padded?: boolean;
  compact?: boolean;
  /** Hairline border — default on for grouped/inset; elevated uses shadow only. */
  bordered?: boolean;
  animatedStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
};

/**
 * DL v3 surface — hierarchy via fill; elevated alone may cast a shadow.
 * Prefer ListSection for settings-style groups.
 */
export function Surface({
  children,
  variant = 'grouped',
  inset = false,
  padded = true,
  compact = false,
  bordered,
  animatedStyle,
  style,
  ...props
}: SurfaceProps) {
  const { colors, shadows } = useTheme();
  const resolved: SurfaceVariant = inset ? 'inset' : variant;
  const pad = compact ? tokens.space[3] : tokens.space.stack + 4;

  /** Grouped/inset: fill + optional hairline. Elevated: fill + shadow, no hairline by default. */
  const showBorder =
    bordered ?? (resolved === 'grouped' || resolved === 'inset');

  const base: ViewStyle = {
    borderRadius: tokens.radius.group,
    backgroundColor:
      resolved === 'plain'
        ? 'transparent'
        : resolved === 'elevated'
          ? colors.surfaceElevated
          : colors.card,
    ...(showBorder
      ? {
          borderWidth: tokens.control.hairline,
          borderColor: colors.border,
        }
      : null),
    ...(resolved === 'elevated' ? shadows.elevated : null),
    ...(padded ? { padding: pad, gap: tokens.space.stack } : null),
    ...(resolved === 'inset' ? { marginHorizontal: tokens.space.screenX } : null),
  };

  if (animatedStyle) {
    return (
      <Animated.View style={[base, animatedStyle, style]} {...props}>
        {children}
      </Animated.View>
    );
  }

  return (
    <View style={[base, style]} {...props}>
      {children}
    </View>
  );
}
