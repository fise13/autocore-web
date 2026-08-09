/**
 * Canonical semantic colour tokens for every AutoCore client.
 *
 * This file is the single source of truth. Web consumes it through the
 * generated `src/styles/design-tokens.css`; mobile re-exports it from
 * `autocore-mobile/theme/colors.ts`. Never hand-edit colours in either
 * client — change them here and regenerate (`npm run tokens:build`).
 *
 * Tone tokens follow a four-part contract:
 *   `x`           solid fill
 *   `xForeground` content sitting on the solid fill
 *   `xSubtle`     tinted surface for badges, chips and callouts
 *   `xOnSubtle`   content sitting on `xSubtle` (>= 4.5:1, enforced in CI)
 *   `xBorder`     hairline that reads against the card surface
 *
 * `xSubtle` and `xBorder` are pre-composited against the card colour rather
 * than applied as runtime alpha, so contrast is identical on both platforms
 * and cannot drift with whatever sits behind the element.
 */

export type ColorScheme = 'light' | 'dark';

export type SemanticColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  primary: string;
  primaryForeground: string;
  primaryHover: string;
  primaryPressed: string;
  primarySubtle: string;
  primaryOnSubtle: string;
  primaryBorder: string;

  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;

  destructive: string;
  destructiveForeground: string;

  border: string;
  borderMuted: string;
  input: string;
  ring: string;

  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;

  success: string;
  successForeground: string;
  successSubtle: string;
  successOnSubtle: string;
  successBorder: string;

  warning: string;
  warningForeground: string;
  warningSubtle: string;
  warningOnSubtle: string;
  warningBorder: string;

  danger: string;
  dangerForeground: string;
  dangerSubtle: string;
  dangerOnSubtle: string;
  dangerBorder: string;

  /** Calm AI state — cool teal, never neon. */
  ai: string;
  aiForeground: string;
  aiSubtle: string;
  aiOnSubtle: string;
  aiBorder: string;

  /** Offline / sync-degraded state. */
  offline: string;
  offlineForeground: string;
  offlineSubtle: string;
  offlineOnSubtle: string;
  offlineBorder: string;

  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;

  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;

  overlay: string;
  glass: string;
};

const light: SemanticColors = {
  background: '#f5f7fb',
  foreground: '#11131a',
  card: '#ffffff',
  cardForeground: '#11131a',
  popover: '#ffffff',
  popoverForeground: '#11131a',

  primary: '#0a73f2',
  primaryForeground: '#ffffff',
  primaryHover: '#0968db',
  primaryPressed: '#085cc4',
  primarySubtle: '#e2eefd',
  primaryOnSubtle: '#0a5fc4',
  primaryBorder: '#bad8fb',

  secondary: '#eef2f7',
  secondaryForeground: '#11131a',
  muted: '#f1f4fa',
  mutedForeground: '#5a606c',
  accent: '#0a73f2',
  accentForeground: '#ffffff',

  destructive: '#eb3838',
  destructiveForeground: '#ffffff',

  border: 'rgba(17, 19, 26, 0.1)',
  borderMuted: 'rgba(17, 19, 26, 0.06)',
  input: 'rgba(17, 19, 26, 0.12)',
  ring: '#66b8ff',

  surface: '#ffffff',
  surfaceSecondary: '#f1f4fa',
  surfaceElevated: '#ffffff',
  textPrimary: '#11131a',
  textSecondary: '#5a606c',

  success: '#26b34a',
  successForeground: '#11131a',
  successSubtle: '#e5f6e9',
  successOnSubtle: '#0f7a35',
  successBorder: '#c2eacc',

  warning: '#f0a500',
  warningForeground: '#11131a',
  warningSubtle: '#fdf4e0',
  warningOnSubtle: '#8a5a00',
  warningBorder: '#fbe6b8',

  danger: '#eb3838',
  dangerForeground: '#ffffff',
  dangerSubtle: '#fde7e7',
  dangerOnSubtle: '#c02626',
  dangerBorder: '#f9c7c7',

  ai: '#0f766e',
  aiForeground: '#ffffff',
  aiSubtle: '#e0f2f1',
  aiOnSubtle: '#0f5c56',
  aiBorder: '#b2dfdb',

  offline: '#5a606c',
  offlineForeground: '#ffffff',
  offlineSubtle: '#eef0f4',
  offlineOnSubtle: '#3d424c',
  offlineBorder: '#d5d8e0',

  chart1: '#0a73f2',
  chart2: '#26b34a',
  chart3: '#f0a500',
  chart4: '#3390f0',
  chart5: '#5a606c',

  sidebar: '#eef2f7',
  sidebarForeground: '#11131a',
  sidebarPrimary: '#0a73f2',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#f1f4fa',
  sidebarAccentForeground: '#11131a',
  sidebarBorder: 'rgba(17, 19, 26, 0.1)',
  sidebarRing: '#66b8ff',

  overlay: 'rgba(17, 19, 26, 0.45)',
  glass: 'rgba(255, 255, 255, 0.72)',
};

const dark: SemanticColors = {
  background: '#0d0e12',
  foreground: '#f5f5f7',
  card: '#1a1c24',
  cardForeground: '#f5f5f7',
  popover: '#1a1c24',
  popoverForeground: '#f5f5f7',

  primary: '#4d96ff',
  primaryForeground: '#0d0e12',
  primaryHover: '#66b8ff',
  primaryPressed: '#3390f0',
  primarySubtle: '#202b3e',
  primaryOnSubtle: '#4d96ff',
  primaryBorder: '#2a436a',

  secondary: '#14161e',
  secondaryForeground: '#f5f5f7',
  muted: '#1a1c24',
  mutedForeground: '#a8acb8',
  accent: '#4d96ff',
  accentForeground: '#0d0e12',

  destructive: '#ff6166',
  destructiveForeground: '#0d0e12',

  border: 'rgba(255, 255, 255, 0.08)',
  borderMuted: 'rgba(255, 255, 255, 0.04)',
  input: 'rgba(255, 255, 255, 0.14)',
  ring: '#66b8ff',

  surface: '#1a1c24',
  surfaceSecondary: '#14161e',
  surfaceElevated: '#22242e',
  textPrimary: '#f5f5f7',
  textSecondary: '#a8acb8',

  success: '#40d168',
  successForeground: '#0d0e12',
  successSubtle: '#1f322c',
  successOnSubtle: '#40d168',
  successBorder: '#26563a',

  warning: '#ffc94d',
  warningForeground: '#0d0e12',
  warningSubtle: '#353129',
  warningOnSubtle: '#ffc94d',
  warningBorder: '#635331',

  danger: '#ff6166',
  dangerForeground: '#0d0e12',
  dangerSubtle: '#35242c',
  dangerOnSubtle: '#ff6166',
  dangerBorder: '#633239',

  ai: '#2dd4bf',
  aiForeground: '#0d0e12',
  aiSubtle: '#1a2e2c',
  aiOnSubtle: '#2dd4bf',
  aiBorder: '#2a4a46',

  offline: '#9498a4',
  offlineForeground: '#0d0e12',
  offlineSubtle: '#22242e',
  offlineOnSubtle: '#c4c7d0',
  offlineBorder: '#3a3d48',

  chart1: '#4d96ff',
  chart2: '#40d168',
  chart3: '#ffc94d',
  chart4: '#66b8ff',
  chart5: '#9498a4',

  sidebar: '#12141a',
  sidebarForeground: '#f5f5f7',
  sidebarPrimary: '#4d96ff',
  sidebarPrimaryForeground: '#0d0e12',
  sidebarAccent: '#161820',
  sidebarAccentForeground: '#f5f5f7',
  sidebarBorder: 'rgba(255, 255, 255, 0.08)',
  sidebarRing: '#66b8ff',

  overlay: 'rgba(0, 0, 0, 0.55)',
  glass: 'rgba(22, 24, 32, 0.72)',
};

export const colors = { light, dark } as const;

export function getColors(scheme: ColorScheme): SemanticColors {
  return colors[scheme];
}

export const colorSchemes: readonly ColorScheme[] = ['light', 'dark'];

/**
 * Tone contract pairs asserted by `npm run tokens:check`.
 * Each entry must clear WCAG AA (4.5:1) in both schemes.
 */
export const contrastContract: ReadonlyArray<{
  name: string;
  foreground: keyof SemanticColors;
  background: keyof SemanticColors;
}> = [
  { name: 'body text on background', foreground: 'foreground', background: 'background' },
  { name: 'body text on card', foreground: 'cardForeground', background: 'card' },
  { name: 'muted text on background', foreground: 'mutedForeground', background: 'background' },
  { name: 'muted text on card', foreground: 'mutedForeground', background: 'card' },
  { name: 'primary tone on subtle', foreground: 'primaryOnSubtle', background: 'primarySubtle' },
  { name: 'success tone on subtle', foreground: 'successOnSubtle', background: 'successSubtle' },
  { name: 'warning tone on subtle', foreground: 'warningOnSubtle', background: 'warningSubtle' },
  { name: 'danger tone on subtle', foreground: 'dangerOnSubtle', background: 'dangerSubtle' },
  { name: 'ai tone on subtle', foreground: 'aiOnSubtle', background: 'aiSubtle' },
  { name: 'offline tone on subtle', foreground: 'offlineOnSubtle', background: 'offlineSubtle' },
  { name: 'success content on fill', foreground: 'successForeground', background: 'success' },
  { name: 'warning content on fill', foreground: 'warningForeground', background: 'warning' },
  { name: 'primary content on fill', foreground: 'primaryForeground', background: 'primary' },
  { name: 'danger content on fill', foreground: 'dangerForeground', background: 'danger' },
  { name: 'ai content on fill', foreground: 'aiForeground', background: 'ai' },
  { name: 'offline content on fill', foreground: 'offlineForeground', background: 'offline' },
  { name: 'sidebar text on sidebar', foreground: 'sidebarForeground', background: 'sidebar' },
];
