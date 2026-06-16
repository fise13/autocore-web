const COMPANY_GRADIENTS = [
  "from-emerald-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-pink-500",
  "from-lime-500 to-teal-500",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function companyAvatarGradient(companyId: string): string {
  const index = hashString(companyId) % COMPANY_GRADIENTS.length;
  return COMPANY_GRADIENTS[index] ?? COMPANY_GRADIENTS[0];
}

export function companyMonogramLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AC";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}
