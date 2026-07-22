import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getFloatingTabBarOffset,
  getModalActionScrollInset,
  getScreenActionScrollInset,
} from '@/lib/navigation/floating-tab-bar-inset';

export function useFloatingTabBarInset() {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      footerBottom: getFloatingTabBarOffset(insets.bottom),
      scrollBottom: getScreenActionScrollInset(insets.bottom),
      /** For modal screens that sit above the tab bar. */
      modalScrollBottom: getModalActionScrollInset(insets.bottom),
      safeBottom: Math.max(insets.bottom, 8),
    }),
    [insets.bottom],
  );
}
