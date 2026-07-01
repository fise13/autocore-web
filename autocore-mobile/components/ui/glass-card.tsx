import { View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks';
import { radius, spacing } from '@/theme';

type GlassCardProps = ViewProps & {
  intensity?: number;
  padding?: number;
};

/** Mirrors .mc-glass-panel from globals.css */
export function GlassCard({ children, intensity = 40, padding = spacing[4], style, ...props }: GlassCardProps) {
  const { colors, shadows, isDark } = useTheme();

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          {
            backgroundColor: colors.glass,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: colors.borderMuted,
            padding,
            ...shadows.sm,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? 'dark' : 'light'}
      style={[
        {
          borderRadius: radius['2xl'],
          borderWidth: 1,
          borderColor: colors.borderMuted,
          overflow: 'hidden',
          ...shadows.sm,
        },
        style,
      ]}
      {...props}
    >
      <View style={{ padding }}>{children}</View>
    </BlurView>
  );
}
