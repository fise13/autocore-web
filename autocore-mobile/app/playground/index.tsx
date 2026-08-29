import { Redirect } from 'expo-router';

import { PlaygroundScreen } from '@/features/playground/playground-screen';

/** `__DEV__` lab — full dock. + opens compact Ask Core; send goes to `/playground/core`. */
export default function PlaygroundRoute() {
  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }
  return <PlaygroundScreen />;
}
