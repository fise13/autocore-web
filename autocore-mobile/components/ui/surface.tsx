import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

type SurfaceProps = ViewProps & {
  children: ReactNode;
  /** Horizontal page inset (settings-style cards) */
  inset?: boolean;
  /** Internal padding — default on */
  padded?: boolean;
  /** Compact padding */
  compact?: boolean;
  /** Optional enter animation style */
  animatedStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
};

/** Primary surface: card background, hairline border, shared radius. */
export function Surface({
  children,
  inset = false,
  padded = true,
  compact = false,
  animatedStyle,
  style,
  ...props
}: SurfaceProps) {
  const { colors } = useTheme();
  const pad = compact ? rhythm.cardPadY : rhythm.cardPadX + 2;

  const base: ViewStyle = {
    borderRadius: rhythm.cardRadius,
    borderWidth: rhythm.hairline,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...(padded ? { padding: pad, gap: rhythm.stack } : null),
    ...(inset ? { marginHorizontal: rhythm.pad } : null),
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
