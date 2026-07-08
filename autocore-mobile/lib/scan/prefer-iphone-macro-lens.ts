/**
 * Prefer virtual multi-camera devices on iPhone — they auto-switch to macro
 * like the native Camera app. Avoid forcing ultra-wide alone (hurts distance scans).
 */
const VIRTUAL_LENS_HINTS = ['triple', 'тройн', 'dual wide', 'двойн широк', 'dual-wide'] as const;

export function preferIphoneMacroLens(lenses: readonly string[]): string | null {
  if (lenses.length <= 1) return null;

  const normalized = lenses.map((lens) => lens.toLowerCase());

  for (const hint of VIRTUAL_LENS_HINTS) {
    const index = normalized.findIndex((lens) => lens.includes(hint));
    if (index >= 0) return lenses[index] ?? null;
  }

  return null;
}
