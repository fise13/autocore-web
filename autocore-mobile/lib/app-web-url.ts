import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

/** Public web app URL (settings, billing, etc.). */
export function getWebAppUrl(path = ''): string {
  const base = getPublicApiBaseUrl().replace(/\/$/, '');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const WEB_SUBSCRIPTION_PATH = '/settings';
