import { pickUserAvatarGradient } from "@/lib/user/user-avatar-style";

/** Apple Sign-In does not expose profile photos — generate a gradient avatar. */
export function buildInitialsAvatarDataUrl(
  displayName: string | null | undefined,
  email: string,
  size = 256,
): string {
  const seed = email.trim().toLowerCase() || displayName?.trim() || "user";
  const { from, to } = pickUserAvatarGradient(seed);
  const gradientId = `g${Math.abs(seed.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 10000}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size / 2}" fill="url(#${gradientId})"/>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
