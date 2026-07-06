const DEFAULT_APP_ORIGIN = 'https://app.myautocore.com';

export function getAppOrigin(override?: string | null): string {
  const configured = override?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return DEFAULT_APP_ORIGIN;
}

export function buildInviteUrl(token: string, appOrigin?: string | null): string {
  const origin = getAppOrigin(appOrigin);
  return `${origin}/invite/${encodeURIComponent(token.trim())}`;
}

export function buildLegacyJoinUrl(token: string, appOrigin?: string | null): string {
  const origin = getAppOrigin(appOrigin);
  return `${origin}/join?token=${encodeURIComponent(token.trim())}`;
}

export function buildMobileInviteDeepLink(token: string): string {
  return `autocoremobile://invite/${encodeURIComponent(token.trim())}`;
}

export function parseInviteTokenFromPath(path: string): string | null {
  const trimmed = path.trim();
  const inviteMatch = trimmed.match(/\/invite\/([^/?#]+)/i);
  if (inviteMatch?.[1]) return decodeURIComponent(inviteMatch[1]);

  const joinMatch = trimmed.match(/[?&](?:token|invite)=([^&#]+)/i);
  if (joinMatch?.[1]) return decodeURIComponent(joinMatch[1]);

  return null;
}
