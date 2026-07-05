import { memo } from 'react';
import { FlashList as ShopifyFlashList, type FlashListProps } from '@shopify/flash-list';

import { rhythm } from '@/theme';

type OptimizedListProps<T> = FlashListProps<T> & {
  /** Apply horizontal page padding to content */
  padded?: boolean;
};

/** FlashList with Autocore defaults for 60fps scrolling (FlashList v2). */
function FlashListInner<T>({
  contentContainerStyle,
  padded = false,
  ...props
}: OptimizedListProps<T>) {
  return (
    <ShopifyFlashList
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[padded ? { paddingHorizontal: rhythm.pad } : null, contentContainerStyle]}
      {...props}
    />
  );
}

export const FlashList = memo(FlashListInner) as typeof FlashListInner;

export function useListStaggerDelay(index: number, baseMs = 40) {
  return Math.min(index, 6) * baseMs;
}
