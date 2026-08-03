import { useMemo } from 'react';

import { useReducedMotion } from '@/hooks/use-accessibility';
import { autocoreEase } from '@/theme/animations';
import { tokens } from '@/theme/tokens';

/**
 * Motion policy gate — every interactive animation should go through this.
 * When reduced motion is on, springs become short timing and travel is collapsed.
 */
export function useMotion() {
  const reduced = useReducedMotion();

  return useMemo(() => {
    const springs = tokens.motion.springs;
    return {
      reduced,
      springs: reduced
        ? {
            press: { damping: 50, stiffness: 500, mass: 1 },
            settle: { damping: 50, stiffness: 500, mass: 1 },
            sheet: { damping: 50, stiffness: 500, mass: 1 },
            list: { damping: 50, stiffness: 500, mass: 1 },
            nav: { damping: 50, stiffness: 500, mass: 1 },
          }
        : springs,
      duration: reduced
        ? {
            instant: 0,
            fast: 80,
            normal: 100,
            medium: 120,
            slow: 140,
          }
        : tokens.motion.duration,
      /** Prefer transform travel; collapse when reduced. */
      travel: (distance: number) => (reduced ? 0 : distance),
      ease: autocoreEase,
    };
  }, [reduced]);
}

export type MotionApi = ReturnType<typeof useMotion>;
