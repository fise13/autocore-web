import { forwardRef, memo } from 'react';
import { FlashList as ShopifyFlashList, type FlashListProps, type FlashListRef } from '@shopify/flash-list';

import { rhythm } from '@/theme';

type OptimizedListProps<T> = FlashListProps<T> & {
  /** Apply horizontal page padding to content */
  padded?: boolean;
};

/** FlashList with Autocore defaults for 60fps scrolling (FlashList v2). */
function FlashListInner<T>(
  { contentContainerStyle, padded = false, ...props }: OptimizedListProps<T>,
  ref: React.ForwardedRef<FlashListRef<T>>,
) {
  return (
    <ShopifyFlashList
      ref={ref}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[padded ? { paddingHorizontal: rhythm.pad } : null, contentContainerStyle]}
      {...props}
    />
  );
}

export const FlashList = memo(forwardRef(FlashListInner)) as <T>(
  props: OptimizedListProps<T> & { ref?: React.Ref<FlashListRef<T>> },
) => React.ReactElement;

export function useListStaggerDelay(index: number, baseMs = 40) {
  return Math.min(index, 6) * baseMs;
}
