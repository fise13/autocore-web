import { useEffect } from 'react';
import { Appearance, LogBox, Platform } from 'react-native';

import { hideNativeSplashOnce } from '@/lib/splash';

import { seedPreviewSession } from './seed-preview-session';

if (process.env.EXPO_PUBLIC_STORE_SHOTS === '1' && Platform.OS !== 'web') {
  LogBox.ignoreAllLogs(true);
  Appearance.setColorScheme('dark');
  seedPreviewSession();
}

/** Locks dark UI and a preview owner session for App Store captures. */
export function StoreShotsBootstrap() {
  seedPreviewSession();
  // The real splash waits for the company's catalogs to bootstrap; the preview
  // company has none, so it would stay on the splash forever.
  useEffect(() => hideNativeSplashOnce(), []);
  return null;
}
