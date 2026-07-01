import type { CSSProperties } from "react";

/** Vercel-inspired mesh gradients — muted neutrals with subtle accent hues. */
const COMPANY_AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #171717 0%, #404040 45%, #262626 100%)",
  "linear-gradient(135deg, #0070f3 0%, #00dfd8 100%)",
  "linear-gradient(135deg, #7928ca 0%, #ff0080 100%)",
  "linear-gradient(135deg, #0a0a0a 0%, #3f3f46 50%, #18181b 100%)",
  "linear-gradient(135deg, #18181b 0%, #52525b 40%, #27272a 100%)",
  "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #312e81 100%)",
  "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #082f49 100%)",
  "linear-gradient(135deg, #14532d 0%, #166534 50%, #052e16 100%)",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function companyAvatarStyle(companyId: string): CSSProperties {
  const index = hashString(companyId) % COMPANY_AVATAR_GRADIENTS.length;
  return {
    background: COMPANY_AVATAR_GRADIENTS[index] ?? COMPANY_AVATAR_GRADIENTS[0],
  };
}

/** @deprecated Use companyAvatarStyle for inline background */
export function companyAvatarGradient(companyId: string): string {
  void companyId;
  return "from-neutral-700 to-neutral-900";
}

export function companyMonogramLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AC";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}
