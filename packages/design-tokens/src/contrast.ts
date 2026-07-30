/**
 * WCAG contrast maths shared by the token checker and any runtime that needs
 * to reason about a colour pair. Non-hex values (rgba borders, overlays) are
 * reported as `null` rather than guessed at.
 */

function channel(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function parseHex(color: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const hex = match[1].length === 3
    ? [...match[1]].map((c) => c + c).join('')
    : match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

export function relativeLuminance(color: string): number | null {
  const rgb = parseHex(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => channel(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio, or `null` when either colour is not an opaque hex. */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite `foreground` at `alpha` over an opaque `background`. */
export function compositeOver(foreground: string, background: string, alpha: number): string | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const blended = fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));
  return `#${blended.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
