import type { SemanticColors } from '@/theme';

import type { HomeAccent } from '../../types-home';

export function resolveHomeAccent(colors: SemanticColors, accent: HomeAccent): string {
  switch (accent) {
    case 'orange':
      return colors.warning;
    case 'green':
      return colors.success;
    case 'red':
      return colors.danger;
    case 'yellow':
      return colors.warning;
    case 'blue':
    default:
      return colors.primary;
  }
}
