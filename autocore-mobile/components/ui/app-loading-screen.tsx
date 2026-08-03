import { AuthSplashSurface } from '@/authentication/auth-splash-surface';

import type { ViewProps } from 'react-native';

type AppLoadingScreenProps = ViewProps & {
  compact?: boolean;
  /** Kept for a11y / call-site compat — never shown on screen. */
  message?: string;
  showAppName?: boolean;
  appear?: boolean;
  exiting?: boolean;
  onExitComplete?: () => void;
};

/**
 * Silent boot surface — brand mark only, with enter/exit fades.
 *
 * Delegates to `AuthSplashSurface` so cold-start stays free of hooks/UI barrels.
 */
export function AppLoadingScreen(props: AppLoadingScreenProps) {
  return <AuthSplashSurface {...props} />;
}
