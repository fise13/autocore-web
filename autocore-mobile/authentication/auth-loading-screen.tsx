import { AuthSplashSurface, type AuthSplashSurfaceProps } from './auth-splash-surface';

type AuthLoadingScreenProps = Pick<
  AuthSplashSurfaceProps,
  'appear' | 'exiting' | 'exitMode' | 'onExitComplete' | 'style'
>;

/**
 * Boot-only Claude-style splash — authentication/ + direct Reanimated import.
 * Avoids `@/hooks` / `@/components/ui` / `@/animations` barrels on cold start.
 */
export function AuthLoadingScreen(props: AuthLoadingScreenProps = {}) {
  return <AuthSplashSurface {...props} />;
}
