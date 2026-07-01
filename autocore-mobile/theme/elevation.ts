import type { ColorScheme } from './colors';
import { getColors } from './colors';
import { getShadows } from './shadow';

/** Elevation levels — maps to surface depth in Autocore UI */
export function getElevation(scheme: ColorScheme) {
  const c = getColors(scheme);
  const shadows = getShadows(scheme);

  return {
    0: {
      backgroundColor: c.background,
      ...shadows.none,
    },
    1: {
      backgroundColor: c.card,
      ...shadows.xs,
    },
    2: {
      backgroundColor: c.card,
      ...shadows.sm,
    },
    3: {
      backgroundColor: c.surfaceElevated,
      ...shadows.soft,
    },
    4: {
      backgroundColor: c.surfaceElevated,
      ...shadows.elevated,
    },
    floating: {
      backgroundColor: c.card,
      ...shadows.elevated,
    },
    glass: {
      backgroundColor: c.glass,
      ...shadows.sm,
    },
  } as const;
}

export type ElevationLevel = keyof ReturnType<typeof getElevation>;
