import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type BreakpointKey = keyof typeof breakpoints;

export function isTablet(screenWidth = width): boolean {
  return screenWidth >= breakpoints.md;
}

export function isDesktop(screenWidth = width): boolean {
  return screenWidth >= breakpoints.lg;
}

export function currentBreakpoint(screenWidth = width): BreakpointKey {
  if (screenWidth >= breakpoints.xl) return 'xl';
  if (screenWidth >= breakpoints.lg) return 'lg';
  if (screenWidth >= breakpoints.md) return 'md';
  if (screenWidth >= breakpoints.sm) return 'sm';
  return 'sm';
}

export const screen = {
  width,
  height,
  isSmall: width < breakpoints.sm,
  isTablet: isTablet(width),
  isDesktop: isDesktop(width),
} as const;

/** Sidebar width for tablet layout */
export const sidebarWidth = {
  collapsed: 56,
  expanded: 240,
} as const;

/** Content max width for large screens */
export const contentMaxWidth = 1280;

export const platform = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
} as const;
