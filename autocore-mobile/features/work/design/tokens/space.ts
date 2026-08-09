export const workOsSpace = {
  micro: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  hero: 40,
  screenX: 20,
  ringGap: 18,
  cardPad: 16,
  tableCellX: 12,
  tableCellY: 10,
  stickyBar: 64,
} as const;

export const workOsRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
  ring: 999,
} as const;

export const workOsElevation = {
  none: {},
  card: {
    shadowColor: '#0A2540',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#0A2540',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
