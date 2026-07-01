import { View, ActivityIndicator } from 'react-native';

import { useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { Text } from './text';

type LoadingProps = {
  message?: string;
  fullScreen?: boolean;
};

/** Mirrors app-loading-screen pattern */
export function Loading({ message, fullScreen = false }: LoadingProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: fullScreen ? 1 : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[8],
        gap: spacing[3],
        backgroundColor: fullScreen ? colors.background : 'transparent',
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text variant="body" color="muted">{message}</Text> : null}
    </View>
  );
}
