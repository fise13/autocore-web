import { Stack } from 'expo-router';

import { OrderTransitionProvider } from '@/features/orders/animation/order-transition-context';

export default function OrdersLayout() {
  return (
    <OrderTransitionProvider>
      <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[id]/index" options={{ animation: 'fade', animationDuration: 220 }} />
        <Stack.Screen name="[id]/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="create-item"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </OrderTransitionProvider>
  );
}
