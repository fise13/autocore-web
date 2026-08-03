import { useCallback } from 'react';

/** Navigate immediately — no exit fade (fading parents blanks nested chart bars). */
export function useMcNavigatePress(onNavigate: () => void) {
  const press = useCallback(() => {
    onNavigate();
  }, [onNavigate]);

  return { press };
}
