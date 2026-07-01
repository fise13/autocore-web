/** Base radius from globals.css: 0.625rem = 10px */
export const baseRadius = 10;

export const radius = {
  none: 0,
  sm: Math.round(baseRadius * 0.6), // 6
  md: Math.round(baseRadius * 0.8), // 8
  lg: baseRadius, // 10
  xl: Math.round(baseRadius * 1.4), // 14
  '2xl': Math.round(baseRadius * 1.8), // 18
  '3xl': Math.round(baseRadius * 2.2), // 22
  '4xl': Math.round(baseRadius * 2.6), // 26
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
