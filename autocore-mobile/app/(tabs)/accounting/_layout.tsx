import { Stack } from 'expo-router';

export default function AccountingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
