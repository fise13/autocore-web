import { Appearance, LogBox, Platform } from 'react-native';

import { seedPreviewSession } from './seed-preview-session';

if (process.env.EXPO_PUBLIC_STORE_SHOTS === '1' && Platform.OS !== 'web') {
  LogBox.ignoreAllLogs(true);
  Appearance.setColorScheme('dark');
  seedPreviewSession();
}

/** Locks dark UI and a preview owner session for App Store captures. */
export function StoreShotsBootstrap() {
  seedPreviewSession();
  return null;
}
