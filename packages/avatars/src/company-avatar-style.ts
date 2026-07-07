import { hashString } from './hash';

export type CompanyAvatarGradient = {
  colors: readonly string[];
  locations?: readonly number[];
};

/** Vercel-inspired mesh gradients — muted neutrals with subtle accent hues. */
export const COMPANY_AVATAR_GRADIENTS: readonly CompanyAvatarGradient[] = [
  { colors: ['#171717', '#404040', '#262626'], locations: [0, 0.45, 1] },
  { colors: ['#0070f3', '#00dfd8'] },
  { colors: ['#7928ca', '#ff0080'] },
  { colors: ['#0a0a0a', '#3f3f46', '#18181b'], locations: [0, 0.5, 1] },
  { colors: ['#18181b', '#52525b', '#27272a'], locations: [0, 0.4, 1] },
  { colors: ['#1e1b4b', '#4338ca', '#312e81'], locations: [0, 0.5, 1] },
  { colors: ['#0c4a6e', '#0369a1', '#082f49'], locations: [0, 0.5, 1] },
  { colors: ['#14532d', '#166534', '#052e16'], locations: [0, 0.5, 1] },
] as const;

export function pickCompanyAvatarGradient(companyId: string): CompanyAvatarGradient {
  const index = hashString(companyId) % COMPANY_AVATAR_GRADIENTS.length;
  return COMPANY_AVATAR_GRADIENTS[index] ?? COMPANY_AVATAR_GRADIENTS[0];
}

export function companyAvatarGradientCss(companyId: string): string {
  const gradient = pickCompanyAvatarGradient(companyId);
  if (gradient.locations && gradient.locations.length === gradient.colors.length) {
    const stops = gradient.colors
      .map((color, index) => `${color} ${(gradient.locations![index] ?? 0) * 100}%`)
      .join(', ');
    return `linear-gradient(135deg, ${stops})`;
  }

  const last = gradient.colors[gradient.colors.length - 1] ?? gradient.colors[0];
  return `linear-gradient(135deg, ${gradient.colors[0]} 0%, ${last} 100%)`;
}

export function companyAvatarGradientColors(companyId: string): {
  colors: string[];
  locations?: number[];
} {
  const gradient = pickCompanyAvatarGradient(companyId);
  return {
    colors: [...gradient.colors],
    locations: gradient.locations ? [...gradient.locations] : undefined,
  };
}

/** @deprecated Tailwind-era helper kept for older call sites. */
export function companyAvatarGradient(companyId: string): string {
  void companyId;
  return 'from-neutral-700 to-neutral-900';
}
