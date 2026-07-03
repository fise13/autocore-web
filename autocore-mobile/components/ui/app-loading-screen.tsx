import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppLoadingLogo } from '@/components/brand/app-loading-logo';
import { Text } from '@/components/ui/text';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase } from '@/theme/motion';

const APP_NAME = 'AutoCore';

type AppLoadingScreenProps = ViewProps & {
  compact?: boolean;
  message?: string;
};

/** Mirrors src/components/ui/app-loading-screen.tsx */
export function AppLoadingScreen({
  compact = false,
  message = 'Загрузка…',
  style,
  ...props
}: AppLoadingScreenProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : 10);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withTiming(1, { duration: 420, easing: autocoreEase });
    translateY.value = withTiming(0, { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [opacity, reducedMotion, translateY]);

  const labelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[
        {
          flex: compact ? undefined : 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? 12 : 20,
          paddingVertical: compact ? 64 : 0,
          backgroundColor: colors.background,
        },
        style,
      ]}
      {...props}
    >
      <AppLoadingLogo size={compact ? 56 : 80} />
      <Animated.View style={[{ alignItems: 'center', gap: 6 }, labelStyle]}>
        <Text
          variant="body"
          style={{
            fontSize: 14,
            fontWeight: '500',
            letterSpacing: -0.2,
            color: colors.foreground,
          }}
        >
          {APP_NAME}
        </Text>
        <Text variant="caption" style={{ fontSize: 12, color: colors.mutedForeground }}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
