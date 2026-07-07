import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="workspace" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="navigation" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="modules" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="advanced" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="appearance" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="company" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="subscription" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="team" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="language" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="currency" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="inbox" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="security" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="taxes" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="cache" options={{ animation: 'slide_from_right' }} />
      {__DEV__ ? (
        <Stack.Screen name="diagnostics" options={{ animation: 'slide_from_right' }} />
      ) : null}
      <Stack.Screen name="version" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="finance" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
