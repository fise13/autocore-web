import { memo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks';

const RootStack = memo(function RootStack() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      {/* Reached from Mission, Scan and notifications — pushed screens, not
          tabs, so the bar can stay at five without hiding routes (a hidden
          native tab cannot be navigated to at all). */}
      <Stack.Screen name="search" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="warehouse" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="import" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="invite" options={{ animation: 'fade' }} />
      <Stack.Screen name="join" options={{ animation: 'fade' }} />
      {/* Presented modally so the paywall reads as an interruption the user
          can always dismiss — required by 3.1.2, and it keeps the underlying
          screen in place so dismissing returns exactly where they were. */}
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }}
      />
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
