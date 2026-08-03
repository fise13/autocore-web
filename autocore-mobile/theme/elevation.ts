import type { ColorScheme, SemanticColors } from './colors';
import { getColors } from './colors';
import { getShadows } from './shadow';

/**
 * Elevation levels — shadows only for floating / modal (DL v3).
 * Grouped cards use fill or hairline via Surface — not elevation shadows.
 */
export function getElevation(schemeOrColors: ColorScheme | SemanticColors) {
  const c = typeof schemeOrColors === 'string' ? getColors(schemeOrColors) : schemeOrColors;
  const scheme: ColorScheme =
    typeof schemeOrColors === 'string' ? schemeOrColors : 'light';
  const shadows = getShadows(scheme);

  return {
    0: {
      backgroundColor: c.background,
      ...shadows.none,
    },
    1: {
      backgroundColor: c.card,
      ...shadows.none,
    },
    2: {
      backgroundColor: c.card,
      ...shadows.none,
    },
    3: {
      backgroundColor: c.surfaceElevated,
      ...shadows.none,
    },
    4: {
      backgroundColor: c.surfaceElevated,
      ...shadows.elevated,
    },
    none: {
      backgroundColor: c.card,
      ...shadows.none,
    },
    floating: {
      backgroundColor: c.card,
      ...shadows.elevated,
    },
    modal: {
      backgroundColor: c.surfaceElevated,
      ...shadows.elevated,
    },
    glass: {
      backgroundColor: c.glass,
      ...shadows.none,
    },
  } as const;
}

export type ElevationLevel = keyof ReturnType<typeof getElevation>;
