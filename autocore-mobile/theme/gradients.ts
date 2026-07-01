import type { ColorScheme } from './colors';
import { getColors } from './colors';
import { withAlpha } from './color-utils';

export type GradientStop = { offset: string; color: string };

export function getGradients(scheme: ColorScheme) {
  const c = getColors(scheme);

  return {
    /** mc-hero-title gradient */
    heroTitle: [c.foreground, blend(c.foreground, c.primary, 0.25)] as [string, string],
    /** Mission control canvas radial accents */
    canvasPrimary: `radial-gradient(ellipse 80% 60% at 10% -10%, ${withAlpha(c.primary, 0.14)}, transparent 55%)`,
    canvasSuccess: `radial-gradient(ellipse 60% 50% at 90% 0%, ${withAlpha(c.chart2, 0.1)}, transparent 50%)`,
    /** mc-module-header */
    moduleHeader: [withAlpha(c.muted, 0.28), 'transparent'] as [string, string],
    /** mc-kpi-shell */
    kpiShell: [withAlpha(c.muted, 0.28), c.card] as [string, string],
    /** Primary badge glow */
    primaryGlow: [withAlpha(c.primary, 0.12), c.card] as [string, string],
    /** Glass panel */
    glass: [withAlpha(c.card, 0.88), withAlpha(c.card, 0.72)] as [string, string],
    /** Shimmer skeleton */
    shimmer: scheme === 'dark'
      ? ['#161820', '#1c1e28', '#161820']
      : ['#f1f4fa', '#ffffff', '#f1f4fa'],
    /** Avatar fallback — matches gradient-avatar-fallback */
    avatar: ['#4d96ff', '#0a73f2'] as [string, string],
  } as const;
}

function blend(a: string, b: string, t: number): string {
  return t > 0.5 ? b : a;
}
