import { memo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks';

const RootStack = memo(function RootStack() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="invite" options={{ animation: 'fade' }} />
      <Stack.Screen name="join" options={{ animation: 'fade' }} />
      {__DEV__ ? <Stack.Screen name="design-system" options={{ presentation: 'card' }} /> : null}
    </Stack>
  );
});

function RootStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export function RootNavigator() {
  return (
    <>
      <RootStatusBar />
      <RootStack />
    </>
  );
}
