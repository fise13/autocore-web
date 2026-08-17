import { Stack } from 'expo-router';

import { formSheetScreenOptions, stackOptionsFor } from '@/theme/navigation-policy';

export default function ObjectsLayout() {
  return (
    <Stack screenOptions={{ ...stackOptionsFor('drillIn'), headerShown: false }}>
      <Stack.Screen name="engines" />
      <Stack.Screen name="engine/[id]" />
      {/* Composer, not a drill-in — same form sheet as the ledger's New
          Operation and the Add-part composer: grabber, detents, its own
          Cancel / Add row instead of the native header. */}
      <Stack.Screen
        name="new"
        options={{
          ...formSheetScreenOptions({ detents: [0.5, 1], initialDetentIndex: 'last' }),
          headerShown: false,
          title: 'Add engine',
        }}
      />
    </Stack>
  );
}
