import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AppLoadingLogo } from '@/components/brand/app-loading-logo';
import { Text } from '@/components/ui/text';
import { useReducedMotion, useTheme } from '@/hooks';
import { hideNativeSplashOnce } from '@/lib/splash';
import { autocoreEase, duration } from '@/theme';

const APP_NAME = 'AutoCore';

type AppLoadingScreenProps = ViewProps & {
  compact?: boolean;
  message?: string;
  showAppName?: boolean;
};

/** Mirrors src/components/ui/app-loading-screen.tsx */
export function AppLoadingScreen({
  compact = false,
  message = 'Загрузка…',
  showAppName = true,
  style,
  ...props
}: AppLoadingScreenProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    hideNativeSplashOnce();
  }, []);

  const textEntering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.slow).delay(120).easing(autocoreEase);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[
        {
          flex: compact ? undefined : 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? 14 : 20,
          paddingVertical: compact ? 48 : 0,
          backgroundColor: colors.background,
        },
        style,
      ]}
      {...props}
    >
      <AppLoadingLogo size={compact ? 56 : 80} />
      <Animated.View entering={textEntering} style={{ alignItems: 'center', gap: 6 }}>
        {showAppName ? (
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
        ) : null}
        <Text
          variant="caption"
          style={{
            fontSize: 13,
            letterSpacing: -0.1,
            color: colors.mutedForeground,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
