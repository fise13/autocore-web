import { getAccountInitials } from "@/lib/auth/account-info";

function hashStringToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/** Apple Sign-In does not expose profile photos — generate an initials avatar (Apple-style). */
export function buildInitialsAvatarDataUrl(
  displayName: string | null | undefined,
  email: string,
  size = 256,
): string {
  const initials = getAccountInitials(displayName, email);
  const seed = email.trim().toLowerCase() || displayName?.trim() || "user";
  const hue = hashStringToHue(seed);
  const background = `hsl(${hue} 42% 42%)`;
  const fontSize = Math.round(size * 0.36);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${initials}">
  <rect width="${size}" height="${size}" rx="${size / 2}" fill="${background}"/>
  <text x="50%" y="50%" dy="0.09em" text-anchor="middle" fill="#ffffff" font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif" font-size="${fontSize}" font-weight="600">${initials}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
