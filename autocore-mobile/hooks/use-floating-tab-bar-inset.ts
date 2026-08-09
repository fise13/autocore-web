import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getFloatingTabBarOffset,
  getScreenActionScrollInset,
} from '@/lib/navigation/floating-tab-bar-inset';
import { spacing } from '@/theme/spacing';

export function useFloatingTabBarInset() {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const dockClearance = getFloatingTabBarOffset(insets.bottom);
    return {
      /** Bottom offset for sticky footers that sit above the dock. */
      footerBottom: dockClearance,
      /**
       * Scroll padding for tab screens — clears the floating dock with breathing room.
       * Does NOT include sticky action-footer height.
       */
      scrollBottom: dockClearance + spacing[5],
      /** Scroll padding when the screen also has a sticky action footer. */
      actionScrollBottom: getScreenActionScrollInset(insets.bottom),
      safeBottom: Math.max(insets.bottom, 12),
    };
  }, [insets.bottom]);
}
