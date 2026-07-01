/**
 * Autocore semantic color tokens — extracted from src/app/globals.css
 * Never use raw hex in components; reference these tokens.
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
  warning: string;
  danger: string;
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
  secondary: '#eef2f7',
  secondaryForeground: '#11131a',
  muted: '#f1f4fa',
  mutedForeground: '#6e7480',
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
  textSecondary: '#6e7480',
  success: '#26b34a',
  warning: '#f0a500',
  danger: '#eb3838',
  chart1: '#0a73f2',
  chart2: '#26b34a',
  chart3: '#f0a500',
  chart4: '#3390f0',
  chart5: '#6e7480',
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
  card: '#161820',
  cardForeground: '#f5f5f7',
  popover: '#161820',
  popoverForeground: '#f5f5f7',
  primary: '#4d96ff',
  primaryForeground: '#0d0e12',
  primaryHover: '#66b8ff',
  primaryPressed: '#3390f0',
  secondary: '#12141a',
  secondaryForeground: '#f5f5f7',
  muted: '#161820',
  mutedForeground: '#9498a4',
  accent: '#4d96ff',
  accentForeground: '#0d0e12',
  destructive: '#ff6166',
  destructiveForeground: '#0d0e12',
  border: 'rgba(255, 255, 255, 0.08)',
  borderMuted: 'rgba(255, 255, 255, 0.04)',
  input: 'rgba(255, 255, 255, 0.14)',
  ring: '#66b8ff',
  surface: '#161820',
  surfaceSecondary: '#12141a',
  surfaceElevated: '#1c1e28',
  textPrimary: '#f5f5f7',
  textSecondary: '#9498a4',
  success: '#40d168',
  warning: '#ffc94d',
  danger: '#ff6166',
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

/** CSS variable map for NativeWind / web */
export function toCssVariables(scheme: ColorScheme): Record<string, string> {
  const c = getColors(scheme);
  return {
    '--color-background': c.background,
    '--color-foreground': c.foreground,
    '--color-card': c.card,
    '--color-card-foreground': c.cardForeground,
    '--color-popover': c.popover,
    '--color-popover-foreground': c.popoverForeground,
    '--color-primary': c.primary,
    '--color-primary-foreground': c.primaryForeground,
    '--color-secondary': c.secondary,
    '--color-secondary-foreground': c.secondaryForeground,
    '--color-muted': c.muted,
    '--color-muted-foreground': c.mutedForeground,
    '--color-accent': c.accent,
    '--color-accent-foreground': c.accentForeground,
    '--color-destructive': c.destructive,
    '--color-border': c.border,
    '--color-input': c.input,
    '--color-ring': c.ring,
    '--color-success': c.success,
    '--color-warning': c.warning,
    '--color-chart-1': c.chart1,
    '--color-chart-2': c.chart2,
    '--color-chart-3': c.chart3,
    '--color-chart-4': c.chart4,
    '--color-chart-5': c.chart5,
    '--color-sidebar': c.sidebar,
    '--color-sidebar-foreground': c.sidebarForeground,
    '--color-sidebar-primary': c.sidebarPrimary,
    '--color-sidebar-primary-foreground': c.sidebarPrimaryForeground,
    '--color-sidebar-accent': c.sidebarAccent,
    '--color-sidebar-accent-foreground': c.sidebarAccentForeground,
    '--color-sidebar-border': c.sidebarBorder,
    '--color-sidebar-ring': c.sidebarRing,
  };
}
