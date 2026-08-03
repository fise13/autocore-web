import { Stack } from 'expo-router';

import { formSheetScreenOptions, stackOptionsFor } from '@/theme/navigation-policy';

export default function AccountingLayout() {
  const tabRoot = stackOptionsFor('tabRoot');

  return (
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }}>
      <Stack.Screen name="index" options={{ ...tabRoot, headerShown: false }} />
      <Stack.Screen
        name="new"
        options={{
          ...formSheetScreenOptions({
            detents: [0.5, 1],
            initialDetentIndex: 'last',
          }),
          title: 'New Operation',
        }}
      />
    </Stack>
  );
}
