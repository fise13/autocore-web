import { Stack } from 'expo-router';

export default function FinanceComposeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ headerShown: false, animation: 'none' }} />
    </Stack>
  );
}
