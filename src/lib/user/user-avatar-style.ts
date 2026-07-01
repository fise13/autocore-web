import type { CSSProperties } from "react";

/** Vibrant profile gradients — stable per user seed (id, email, uid). */
export const USER_AVATAR_GRADIENTS = [
  { from: "#86efac", to: "#38bdf8" },
  { from: "#67e8f9", to: "#c084fc" },
  { from: "#fdba74", to: "#4ade80" },
  { from: "#fb7185", to: "#bef264" },
  { from: "#fbbf24", to: "#34d399" },
  { from: "#a78bfa", to: "#f472b6" },
  { from: "#7dd3fc", to: "#6ee7b7" },
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickUserAvatarGradient(seed: string): (typeof USER_AVATAR_GRADIENTS)[number] {
  const normalized = seed.trim() || "user";
  const index = hashString(normalized) % USER_AVATAR_GRADIENTS.length;
  return USER_AVATAR_GRADIENTS[index] ?? USER_AVATAR_GRADIENTS[0];
}

export function userAvatarStyle(seed: string): CSSProperties {
  const { from, to } = pickUserAvatarGradient(seed);
  return {
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  };
}

export function userAvatarGradientCss(seed: string): string {
  const { from, to } = pickUserAvatarGradient(seed);
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}
