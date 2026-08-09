import { memo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';
import { stackOptionsFor } from '@/theme/navigation-policy';

const RootStack = memo(function RootStack() {
  const drillIn = stackOptionsFor('drillIn');
  const modalTask = stackOptionsFor('modalTask');
  // pageSheet — formSheet + SwiftUI Host blanks RN content (same as WO detail).
  const pageSheet = stackOptionsFor('pageSheet');

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="search" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="warehouse" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="import" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="intake" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="inbox" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="objects" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="invite" options={{ animation: 'fade' }} />
      <Stack.Screen name="join" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="switch-organization"
        options={{
          ...pageSheet,
          headerShown: false,
          title: 'Organizations',
          freezeOnBlur: false,
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal', ...modalTask, headerShown: false }}
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
