import type { SearchResultKind } from '../types';

type KindVisual = {
  iconColor: 'primary' | 'foreground' | 'muted';
  bgOpacity: number;
};

/** Workshop semantics: parts/motors get primary tint, people/orders stay quieter. */
export function kindVisual(kind: SearchResultKind): KindVisual {
  switch (kind) {
    case 'part':
      return { iconColor: 'primary', bgOpacity: 0.12 };
    case 'motor':
    case 'engine':
    case 'gearbox':
      return { iconColor: 'primary', bgOpacity: 0.14 };
    case 'workspace':
      // A jump target, not a record — accent reads as "go here".
      return { iconColor: 'primary', bgOpacity: 0.1 };
    case 'order':
      return { iconColor: 'foreground', bgOpacity: 0.08 };
    case 'client':
      return { iconColor: 'foreground', bgOpacity: 0.06 };
    default:
      return { iconColor: 'muted', bgOpacity: 0.08 };
  }
}
