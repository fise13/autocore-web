import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';

import { AppLoadingLogo } from '@/components/brand/app-loading-logo';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { hideNativeSplashOnce } from '@/lib/splash';

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

  useEffect(() => {
    hideNativeSplashOnce();
  }, []);

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
      <View style={{ alignItems: 'center', gap: 6 }}>
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
      </View>
    </View>
  );
}
