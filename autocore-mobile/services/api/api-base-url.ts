/** Same origin as web `NEXT_PUBLIC_APP_URL` in production. */
export const DEFAULT_APP_API_ORIGIN = 'https://app.myautocore.com';

const LOCAL_DEV_API_ORIGIN = 'http://localhost:3000';

/**
 * Base URL for Next.js API routes (`/api/*`).
 * - Override: `EXPO_PUBLIC_API_BASE_URL`
 * - Dev fallback: localhost (when Next.js runs locally)
 * - Release fallback: app.myautocore.com
 *
 * Note: myautocore.com is the marketing site; APIs live on the app host.
 */
export function getPublicApiBaseUrl(): string {
  const useProdInDev = process.env.EXPO_PUBLIC_USE_PROD_API?.trim() === 'true';
  if (__DEV__ && !useProdInDev) {
    const devOverride = process.env.EXPO_PUBLIC_DEV_API_BASE_URL?.trim();
    return (devOverride || LOCAL_DEV_API_ORIGIN).replace(/\/$/, '');
  }
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return DEFAULT_APP_API_ORIGIN;
}
