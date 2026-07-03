type MotorNameParts = {
  brandName?: string | null;
  engineCode?: string | null;
  configuration?: string | null;
  serialCode?: string | null;
};

export function formatMotorDisplayName(parts: MotorNameParts): string {
  return [parts.brandName, parts.engineCode, parts.configuration].filter(Boolean).join(' ').trim();
}

export function formatMotorLineLabel(
  parts: MotorNameParts,
  options?: { includeSerial?: boolean; fallback?: string },
): string {
  const name = formatMotorDisplayName(parts);
  if (name) return name;
  if (options?.includeSerial && parts.serialCode?.trim()) return parts.serialCode.trim();
  return options?.fallback ?? 'Двигатель';
}
