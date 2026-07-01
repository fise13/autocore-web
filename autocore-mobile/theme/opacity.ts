export const opacity = {
  0: 0,
  5: 0.05,
  10: 0.1,
  15: 0.15,
  20: 0.2,
  25: 0.25,
  30: 0.3,
  35: 0.35,
  40: 0.4,
  45: 0.45,
  50: 0.5,
  55: 0.55,
  60: 0.6,
  65: 0.65,
  70: 0.7,
  75: 0.75,
  80: 0.8,
  85: 0.85,
  90: 0.9,
  95: 0.95,
  100: 1,
} as const;

export type OpacityKey = keyof typeof opacity;

/** Common opacity usages from Autocore web */
export const semanticOpacity = {
  disabled: opacity[50],
  muted: opacity[65],
  overlay: opacity[45],
  glass: 0.72,
  borderSubtle: 0.08,
  destructiveBg: opacity[10],
  primaryBg: 0.12,
  focusRing: opacity[50],
} as const;
