import { useCallback, useState } from 'react';

import { haptics } from '@/theme';

export const COMPOSER_TAB_ORDER = ['labor', 'parts', 'motors'] as const;

export type ComposerTab = (typeof COMPOSER_TAB_ORDER)[number];

export function useComposerTabState(initial: ComposerTab = 'labor') {
  const [tab, setTabState] = useState<ComposerTab>(initial);
  const [direction, setDirection] = useState(0);

  const setTab = useCallback(
    (next: ComposerTab) => {
      setTabState((current) => {
        if (current === next) return current;

        const prevIdx = COMPOSER_TAB_ORDER.indexOf(current);
        const nextIdx = COMPOSER_TAB_ORDER.indexOf(next);
        setDirection(nextIdx > prevIdx ? 1 : -1);
        haptics.selection();
        return next;
      });
    },
    [],
  );

  return { tab, setTab, direction };
}
