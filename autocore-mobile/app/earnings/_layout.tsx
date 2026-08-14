import { Stack } from 'expo-router';

export default function EarningsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }}>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Earnings' }} />
    </Stack>
  );
}
