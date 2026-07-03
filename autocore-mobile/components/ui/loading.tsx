import { View, ActivityIndicator } from 'react-native';

import { AppLoadingScreen } from '@/components/ui/app-loading-screen';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { Text } from './text';

type LoadingProps = {
  message?: string;
  fullScreen?: boolean;
  compact?: boolean;
};

/** Inline spinner, or full-screen brand loader matching web AppLoadingScreen. */
export function Loading({ message, fullScreen = false, compact = false }: LoadingProps) {
  const { colors } = useTheme();

  if (fullScreen || compact) {
    return <AppLoadingScreen compact={compact} message={message} />;
  }

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
      {message ? <Text variant="body" color="muted">{message}</Text> : null}
    </View>
  );
}
