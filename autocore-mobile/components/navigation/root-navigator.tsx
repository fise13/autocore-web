import { memo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';
import { formSheetScreenOptions, stackOptionsFor } from '@/theme/navigation-policy';

const RootStack = memo(function RootStack() {
  const drillIn = stackOptionsFor('drillIn');
  const modalTask = stackOptionsFor('modalTask');
  // pageSheet — formSheet + SwiftUI Host blanks RN content (same as WO detail).
  const pageSheet = stackOptionsFor('pageSheet');

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="(auth)"
        options={{ contentStyle: { backgroundColor: 'transparent' }, animation: 'fade' }}
      />
      <Stack.Screen name="search" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="warehouse" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="import" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="intake" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen name="orders" options={{ ...drillIn, headerShown: false }} />
      <Stack.Screen
        name="finance"
        options={{
          ...formSheetScreenOptions({
            detents: [0.5, 1],
            initialDetentIndex: 'last',
          }),
          headerShown: false,
        }}
      />
      <Stack.Screen name="earnings" options={{ ...drillIn, headerShown: false }} />
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
      {process.env.EXPO_PUBLIC_STORE_SHOTS === '1' ? (
        <Stack.Screen name="store-shots" options={{ animation: 'fade', headerShown: false }} />
      ) : null}
    </Stack>
  );
});

function RootStatusBar() {
  const { isDark } = useTheme();
  // `translucent` was removed from expo-status-bar — Android draws behind the
  // status bar by default now, so the prop is both invalid and redundant.
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
