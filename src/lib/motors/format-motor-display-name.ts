type MotorNameParts = {
  brandName?: string | null;
  engineCode?: string | null;
  configuration?: string | null;
  serialCode?: string | null;
};

/** User-facing motor name: brand + engine code + configuration (no serial). */
export function formatMotorDisplayName(parts: MotorNameParts): string {
  return [parts.brandName, parts.engineCode, parts.configuration].filter(Boolean).join(" ").trim();
}

/** Line label for work orders and documents. Serial is optional secondary detail. */
export function formatMotorLineLabel(
  parts: MotorNameParts & { outcome?: "install" | "sell" },
  options?: { includeSerial?: boolean; fallback?: string },
): string {
  const name = formatMotorDisplayName(parts);
  if (name) return name;
  if (options?.includeSerial && parts.serialCode?.trim()) return parts.serialCode.trim();
  return options?.fallback ?? "Двигатель";
}
