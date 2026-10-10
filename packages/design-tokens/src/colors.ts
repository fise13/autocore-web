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
  /** Brand mark colour: logo, chart series 1, marketing. Not for text on white. */
  brand: string;
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
  secondaryHover: string;
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
  dangerHover: string;

  /** Closed or inactive state (draft, sold, cancelled). `offline*` mirrors these values. */
  neutral: string;
  neutralForeground: string;
  neutralSubtle: string;
  neutralOnSubtle: string;
  neutralBorder: string;

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

  /** Excel-grid range selection fill and active-cell border. */
  gridSelection: string;
  gridActiveBorder: string;

  overlay: string;
  glass: string;
};

const light: SemanticColors = {
  brand: '#0a73f2',
  background: '#f5f7fb',
  foreground: '#11131a',
  card: '#ffffff',
  cardForeground: '#11131a',
  popover: '#ffffff',
  popoverForeground: '#11131a',

  primary: '#0866d6',
  primaryForeground: '#ffffff',
  primaryHover: '#0758bd',
  primaryPressed: '#064ca3',
  primarySubtle: '#e2eefd',
  primaryOnSubtle: '#0a5fc4',
  primaryBorder: '#bad8fb',

  secondary: '#eef2f7',
  secondaryForeground: '#11131a',
  secondaryHover: '#e3e8ef',
  muted: '#f1f4fa',
  mutedForeground: '#5a606c',
  accent: '#0866d6',
  accentForeground: '#ffffff',

  destructive: '#d4292e',
  destructiveForeground: '#ffffff',

  border: 'rgba(17, 19, 26, 0.1)',
  borderMuted: 'rgba(17, 19, 26, 0.06)',
  input: '#868b95',
  ring: '#0866d6',

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

  danger: '#d4292e',
  dangerForeground: '#ffffff',
  dangerSubtle: '#fde7e7',
  dangerOnSubtle: '#c02626',
  dangerBorder: '#f9c7c7',
  dangerHover: '#b92226',

  neutral: '#5a606c',
  neutralForeground: '#ffffff',
  neutralSubtle: '#eef0f4',
  neutralOnSubtle: '#3d424c',
  neutralBorder: '#d5d8e0',

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
  chart2: '#1f9d42',
  chart3: '#b77800',
  chart4: '#3390f0',
  chart5: '#5a606c',

  sidebar: '#eef2f7',
  sidebarForeground: '#11131a',
  sidebarPrimary: '#0866d6',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#f1f4fa',
  sidebarAccentForeground: '#11131a',
  sidebarBorder: 'rgba(17, 19, 26, 0.1)',
  sidebarRing: '#0866d6',

  gridSelection: '#e7f1fe',
  gridActiveBorder: '#0866d6',

  overlay: 'rgba(17, 19, 26, 0.45)',
  glass: 'rgba(255, 255, 255, 0.72)',
};

const dark: SemanticColors = {
  brand: '#4d96ff',
  background: '#0d0e12',
  foreground: '#f5f5f7',
  card: '#1a1c24',
  cardForeground: '#f5f5f7',
  popover: '#22242e',
  popoverForeground: '#f5f5f7',

  primary: '#4d96ff',
  primaryForeground: '#0d0e12',
  primaryHover: '#66b8ff',
  primaryPressed: '#3390f0',
  primarySubtle: '#202b3e',
  primaryOnSubtle: '#4d96ff',
  primaryBorder: '#2a436a',

  secondary: '#22242e',
  secondaryForeground: '#f5f5f7',
  secondaryHover: '#2a2d38',
  muted: '#20222b',
  mutedForeground: '#a8acb8',
  accent: '#4d96ff',
  accentForeground: '#0d0e12',

  destructive: '#ff6166',
  destructiveForeground: '#0d0e12',

  border: 'rgba(255, 255, 255, 0.08)',
  borderMuted: 'rgba(255, 255, 255, 0.04)',
  input: '#6b7080',
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
  dangerHover: '#ff7a7e',

  neutral: '#9498a4',
  neutralForeground: '#0d0e12',
  neutralSubtle: '#22242e',
  neutralOnSubtle: '#c4c7d0',
  neutralBorder: '#3a3d48',

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

  gridSelection: '#23324a',
  gridActiveBorder: '#4d96ff',

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
 * Each entry must clear its minimum (WCAG AA 4.5:1 for text, 3:1 for non-text) in both schemes.
 */
export const contrastContract: ReadonlyArray<{
  name: string;
  foreground: keyof SemanticColors;
  background: keyof SemanticColors;
  /** Required ratio. Defaults to 4.5 (text); 3 is for non-text UI (borders, focus, icons, chart marks). */
  minimum?: 3 | 4.5;
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
  { name: 'link on card', foreground: 'primary', background: 'card' },
  { name: 'link on background', foreground: 'primary', background: 'background' },
  { name: 'muted text on muted', foreground: 'mutedForeground', background: 'muted' },
  { name: 'text on popover', foreground: 'popoverForeground', background: 'popover' },
  { name: 'muted text on popover', foreground: 'mutedForeground', background: 'popover' },
  { name: 'secondary text on secondary', foreground: 'secondaryForeground', background: 'secondary' },
  { name: 'secondary text on secondary hover', foreground: 'secondaryForeground', background: 'secondaryHover' },
  { name: 'primary content on hover', foreground: 'primaryForeground', background: 'primaryHover' },
  { name: 'primary content on pressed', foreground: 'primaryForeground', background: 'primaryPressed' },
  { name: 'danger content on hover', foreground: 'dangerForeground', background: 'dangerHover' },
  { name: 'destructive content on fill', foreground: 'destructiveForeground', background: 'destructive' },
  { name: 'nav active text', foreground: 'primaryOnSubtle', background: 'primarySubtle' },
  { name: 'neutral tone on subtle', foreground: 'neutralOnSubtle', background: 'neutralSubtle' },
  { name: 'neutral content on fill', foreground: 'neutralForeground', background: 'neutral' },
  { name: 'text on grid selection', foreground: 'foreground', background: 'gridSelection' },
  { name: 'muted text on grid selection', foreground: 'mutedForeground', background: 'gridSelection' },
  { name: 'success text on card', foreground: 'successOnSubtle', background: 'card' },
  { name: 'warning text on card', foreground: 'warningOnSubtle', background: 'card' },
  { name: 'danger text on card', foreground: 'dangerOnSubtle', background: 'card' },
  { name: 'focus ring on card', foreground: 'ring', background: 'card', minimum: 3 },
  { name: 'focus ring on background', foreground: 'ring', background: 'background', minimum: 3 },
  { name: 'focus ring on sidebar', foreground: 'ring', background: 'sidebar', minimum: 3 },
  { name: 'input border on card', foreground: 'input', background: 'card', minimum: 3 },
  { name: 'input border on background', foreground: 'input', background: 'background', minimum: 3 },
  { name: 'active cell on selection', foreground: 'gridActiveBorder', background: 'gridSelection', minimum: 3 },
  { name: 'nav indicator on sidebar', foreground: 'sidebarPrimary', background: 'sidebar', minimum: 3 },
  { name: 'chart 1 on card', foreground: 'chart1', background: 'card', minimum: 3 },
  { name: 'chart 2 on card', foreground: 'chart2', background: 'card', minimum: 3 },
  { name: 'chart 3 on card', foreground: 'chart3', background: 'card', minimum: 3 },
];
