import type { ColorScheme, SemanticColors } from './colors';
import { getColors } from './colors';
import { withAlpha } from './color-utils';

export type GradientStop = { offset: string; color: string };

export function getGradients(schemeOrColors: ColorScheme | SemanticColors) {
  const c = typeof schemeOrColors === 'string' ? getColors(schemeOrColors) : schemeOrColors;
  const scheme: ColorScheme =
    typeof schemeOrColors === 'string'
      ? schemeOrColors
      : c.background.toLowerCase() === '#ffffff' || c.background.startsWith('#f')
        ? 'light'
        : 'dark';

  return {
    heroTitle: [c.foreground, blend(c.foreground, c.primary, 0.25)] as [string, string],
    canvasPrimary: `radial-gradient(ellipse 80% 60% at 10% -10%, ${withAlpha(c.primary, 0.14)}, transparent 55%)`,
    canvasSuccess: `radial-gradient(ellipse 60% 50% at 90% 0%, ${withAlpha(c.chart2, 0.1)}, transparent 50%)`,
    moduleHeader: [withAlpha(c.muted, 0.28), 'transparent'] as [string, string],
    kpiShell: [withAlpha(c.muted, 0.28), c.card] as [string, string],
    primaryGlow: [withAlpha(c.primary, 0.12), c.card] as [string, string],
    glass: [withAlpha(c.card, 0.88), withAlpha(c.card, 0.72)] as [string, string],
    shimmer:
      scheme === 'dark' ? [c.muted, c.secondary, c.muted] : [c.muted, c.card, c.muted],
    avatar: [c.primary, c.primaryHover] as [string, string],
  } as const;
}

function blend(a: string, b: string, t: number): string {
  return t > 0.5 ? b : a;
}
