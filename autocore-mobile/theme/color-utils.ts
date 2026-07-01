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
