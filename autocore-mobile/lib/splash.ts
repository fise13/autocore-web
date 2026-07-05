import * as SplashScreen from 'expo-splash-screen';

import { markStartup, logStartupTable } from '@/lib/performance/startup-tracer';

let hidden = false;

/** Hide the native splash once React has a loading or app surface to show. */
export function hideNativeSplashOnce(): void {
  if (hidden) return;
  hidden = true;
  markStartup('splash_hidden');
  void SplashScreen.hideAsync();
}

export function hideNativeSplashAndLogStartup(): void {
  hideNativeSplashOnce();
  logStartupTable();
}
