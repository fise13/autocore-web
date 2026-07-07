import type { Href } from 'expo-router';

import { parseInviteTokenFromPath } from '@autocore/org';

/** Map https:// / autocoremobile:// invite URLs → Expo Router href. */
export function resolveInviteHref(url: string): Href | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      const token = parseInviteTokenFromPath(`${parsed.pathname}${parsed.search}`);
      return token ? (`/invite/${encodeURIComponent(token)}` as Href) : null;
    }

    if (trimmed.startsWith('autocoremobile://')) {
      const path = trimmed.slice('autocoremobile://'.length);
      const token = parseInviteTokenFromPath(path.startsWith('/') ? path : `/${path}`);
      return token ? (`/invite/${encodeURIComponent(token)}` as Href) : null;
    }

    if (trimmed.startsWith('/invite/')) {
      const token = parseInviteTokenFromPath(trimmed);
      return token ? (`/invite/${encodeURIComponent(token)}` as Href) : null;
    }
  } catch {
    return null;
  }

  return null;
}
