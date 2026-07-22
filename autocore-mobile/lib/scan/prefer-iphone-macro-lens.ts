/**
 * Prefer virtual multi-camera devices on iPhone — they auto-switch to macro
 * like the native Camera app. Avoid forcing ultra-wide alone (hurts distance scans).
 *
 * Lens labels come from AVCaptureDevice.localizedName (locale-dependent).
 */
const VIRTUAL_LENS_HINTS = [
  'triple',
  'тройн',
  'builtintriplecamera',
  'dual wide',
  'dual-wide',
  'dualwide',
  'двойн широк',
  'двойная широкоугольная',
  'builtindualwidecamera',
] as const;

export function preferIphoneMacroLens(lenses: readonly string[]): string | null {
  if (lenses.length <= 1) return null;

  const normalized = lenses.map((lens) => lens.toLowerCase().replace(/\s+/g, ' ').trim());

  for (const hint of VIRTUAL_LENS_HINTS) {
    const index = normalized.findIndex((lens) => lens.includes(hint));
    if (index >= 0) return lenses[index] ?? null;
  }

  return null;
}
