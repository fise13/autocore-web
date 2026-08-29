import { Redirect } from 'expo-router';

import { CoreChatScreen } from '@/features/playground/core-chat-screen';

/** `__DEV__` — ChatGPT-style Core. Opened from the playground +. */
export default function PlaygroundCoreRoute() {
  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }
  return <CoreChatScreen />;
}
