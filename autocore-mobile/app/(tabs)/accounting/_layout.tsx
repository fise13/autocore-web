import { Stack } from 'expo-router';

import { formSheetScreenOptions, stackOptionsFor } from '@/theme/navigation-policy';

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
      <Stack.Screen
        name="new"
        options={{
          ...formSheetScreenOptions({
            detents: [0.5, 1],
            initialDetentIndex: 'last',
          }),
          /**
           * The sheet draws its own Cancel · title · Add row, so the native bar
           * is declared off here rather than switched off from inside the
           * screen. Toggling it at runtime left the native header mounted over
           * the custom one: its title painted a second time a couple of points
           * from ours, and its bar kept the touch region, so the sheet's own
           * controls stopped responding.
           */
          headerShown: false,
        }}
      />
    </Stack>
  );
}
