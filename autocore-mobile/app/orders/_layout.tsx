import { Stack } from 'expo-router';

import { OrderTransitionProvider } from '@/features/orders/animation/order-transition-context';
import { formSheetScreenOptions, stackOptionsFor } from '@/theme/navigation-policy';

export default function OrdersLayout() {
  const tabRoot = stackOptionsFor('tabRoot');
  const modalTask = stackOptionsFor('modalTask');

  return (
    <OrderTransitionProvider>
      <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }}>
        <Stack.Screen
          name="index"
          options={{
            ...tabRoot,
            headerShown: false,
            title: 'Work orders',
          }}
        />
        <Stack.Screen
          name="[id]/index"
          options={{
            /** pageSheet — formSheet + SwiftUI Host in chrome was blanking RN content. */
            ...stackOptionsFor('pageSheet'),
            headerShown: false,
            title: 'Work order',
            freezeOnBlur: false,
          }}
        />
        <Stack.Screen
          name="[id]/edit"
          options={{
            ...formSheetScreenOptions({
              detents: [0.5, 1],
              initialDetentIndex: 'last',
            }),
            title: 'Edit Work Order',
          }}
        />
        <Stack.Screen
          name="new"
          options={{
            ...formSheetScreenOptions({
              detents: [0.5, 1],
              initialDetentIndex: 'last',
            }),
            title: 'New Work Order',
          }}
        />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'fullScreenModal', ...stackOptionsFor('immersive'), headerShown: false }}
        />
        <Stack.Screen
          name="create-item"
          options={{ presentation: 'fullScreenModal', ...modalTask }}
        />
      </Stack>
    </OrderTransitionProvider>
  );
}
