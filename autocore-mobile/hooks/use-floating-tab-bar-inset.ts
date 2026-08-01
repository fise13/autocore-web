import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getFloatingTabBarOffset,
  getScreenActionScrollInset,
} from '@/lib/navigation/floating-tab-bar-inset';

export function useFloatingTabBarInset() {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      footerBottom: getFloatingTabBarOffset(insets.bottom),
      scrollBottom: getScreenActionScrollInset(insets.bottom),
      safeBottom: Math.max(insets.bottom, 12),
    }),
    [insets.bottom],
  );
}
