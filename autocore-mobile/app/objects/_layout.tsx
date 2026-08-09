import { Stack } from 'expo-router';

import { stackOptionsFor } from '@/theme/navigation-policy';

export default function ObjectsLayout() {
  return (
    <Stack screenOptions={{ ...stackOptionsFor('drillIn'), headerShown: false }}>
      <Stack.Screen name="engine/[id]" />
    </Stack>
  );
}
