import { Stack } from 'expo-router';

import { stackOptionsFor } from '@/theme/navigation-policy';

export default function FinanceLayout() {
  const tabRoot = stackOptionsFor('tabRoot');
  // Finance drill-downs draw their own large-title chrome, so the native
  // header stays off and only the slide/gesture contract is inherited.
  const drillIn = { ...stackOptionsFor('drillIn'), headerShown: false };

  return (
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }}>
      <Stack.Screen name="index" options={{ ...tabRoot, headerShown: false }} />
      <Stack.Screen name="metric/[id]" options={drillIn} />
      <Stack.Screen name="flow/[id]" options={drillIn} />
      <Stack.Screen name="ledger" options={drillIn} />
      <Stack.Screen name="new" options={{ headerShown: false, animation: 'none' }} />
    </Stack>
  );
}
