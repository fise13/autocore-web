import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { stackOptionsFor } from '@/theme/navigation-policy';

const immersive = stackOptionsFor('immersive');

/** Dev sandbox — dock lab and Ask Core chat. */
export default function PlaygroundLayout() {
  const { colors } = useTheme();

  if (!__DEV__) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="core"
        options={{
          ...immersive,
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack>
  );
}
