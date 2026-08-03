import { Stack } from 'expo-router';

export default function WarehouseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="location/[id]"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
