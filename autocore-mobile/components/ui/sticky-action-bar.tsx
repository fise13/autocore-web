import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { duration, spacing } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

type StickyActionBarProps = {
  children: ReactNode;
};

/** Gap between the button and the home indicator, on top of the safe inset. */
const BOTTOM_GAP = spacing[3];

/**
 * Sticky bottom action bar.
 *
 * Sits above the content with a blurred, hairline-topped surface so the form
 * visibly continues underneath it, and reserves the safe-area inset plus a gap
 * so the action never touches the bottom edge of the screen.
 */
export function StickyActionBar({ children }: StickyActionBarProps) {
  const { colors, isDark, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(duration.medium).springify().damping(26)}
      style={[
        {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          // The blur carries the surface on iOS; elsewhere it needs a fill.
          backgroundColor:
            Platform.OS === 'ios' ? withAlpha(colors.background, 0.7) : colors.background,
        },
        // Depth reads as cheap on dark surfaces — light mode only.
        isDark ? null : shadows.soft,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={28}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          gap: spacing[3],
          paddingHorizontal: spacing[5],
          paddingTop: spacing[3.5],
          paddingBottom: Math.max(insets.bottom, spacing[2]) + BOTTOM_GAP,
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}
