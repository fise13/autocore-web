import { View, ActivityIndicator } from 'react-native';

import { AppLoadingScreen } from '@/components/ui/app-loading-screen';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { Text } from './text';

type LoadingProps = {
  message?: string;
  fullScreen?: boolean;
  /** Legacy spinner — use only when a tiny inline indicator is required. */
  minimal?: boolean;
  showAppName?: boolean;
};

/** Branded loader with animated logo, or legacy minimal spinner. */
export function Loading({
  message,
  fullScreen = false,
  minimal = false,
  showAppName,
}: LoadingProps) {
  const { colors } = useTheme();

  if (minimal) {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[8],
          gap: spacing[3],
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        {message ? (
          <Text variant="body" color="muted">
            {message}
          </Text>
        ) : null}
      </View>
    );
  }

  if (fullScreen) {
    return <AppLoadingScreen message={message} showAppName={showAppName ?? true} />;
  }

  return (
    <AppLoadingScreen
      compact
      message={message}
      showAppName={showAppName ?? false}
    />
  );
}
