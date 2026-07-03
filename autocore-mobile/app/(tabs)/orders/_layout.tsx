import { Stack } from 'expo-router';

import { OrderTransitionProvider } from '@/features/orders/animation/order-transition-context';

export default function OrdersLayout() {
  return (
    <OrderTransitionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[id]" options={{ animation: 'fade', animationDuration: 220 }} />
        <Stack.Screen name="new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </OrderTransitionProvider>
  );
}
