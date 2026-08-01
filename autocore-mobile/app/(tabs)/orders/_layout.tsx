import { Stack } from 'expo-router';

import { OrderTransitionProvider } from '@/features/orders/animation/order-transition-context';

export default function OrdersLayout() {
  return (
    <OrderTransitionProvider>
      <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
        {/* Native large title + translucent bar; the screen supplies the search
            bar and nav-bar buttons so they can reach its state. */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: true,
            title: 'Work orders',
            headerLargeTitle: true,
            headerTransparent: true,
            headerBlurEffect: 'systemChromeMaterial',
            headerShadowVisible: false,
            headerLargeTitleShadowVisible: false,
          }}
        />
        <Stack.Screen name="[id]/index" options={{ animation: 'fade', animationDuration: 220 }} />
        <Stack.Screen name="[id]/edit" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="new" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="create-item"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </OrderTransitionProvider>
  );
}
