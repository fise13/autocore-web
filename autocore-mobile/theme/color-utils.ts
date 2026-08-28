/** Color manipulation — never inline hex alpha in components */
export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  if (color.startsWith('rgba')) return color;
  if (color.startsWith('rgb(')) {
    const [r, g, b] = color.match(/\d+/g) ?? ['0', '0', '0'];
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }
  if (color.length === 7) {
    const a = Math.round(clamped * 255)
      .toString(16)
      .padStart(2, '0');
    return `${color}${a}`;
  }
  return color;
}

export function toneBackground(color: string, alpha = 0.1): string {
  return withAlpha(color, alpha);
}

/**
 * The tint a row takes while a finger is on it.
 *
 * One definition, because it was previously nine. Six call sites agreed on
 * `muted` at 0.55/0.85, `order-row` used 0.9 in light mode, Home and Finance
 * tinted with `foreground` at 0.045 instead, and `settings-row` used raw
 * `muted` at full strength with no animation. Rows that sit two screens apart
 * are hard to compare, which is exactly why the drift went unnoticed and why it
 * has to live somewhere single.
 *
 * Dark mode needs less alpha than light: the same tint over a near-black
 * surface reads far heavier than over a near-white one.
 */
export function pressedRowFill(mutedColor: string, isDark: boolean): string {
  return withAlpha(mutedColor, isDark ? 0.55 : 0.85);
}
