import { Redirect } from 'expo-router';

/**
 * Language picker is not product-ready (English only).
 * Deep links land on Theme instead of a dead-end screen.
 */
export default function LanguageRoute() {
  return <Redirect href="/(tabs)/profile/appearance" />;
}
