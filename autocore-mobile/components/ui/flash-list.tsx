import { memo, useCallback } from 'react';
import { FlashList as ShopifyFlashList, type FlashListProps } from '@shopify/flash-list';

import { useDesignLanguage } from '@/hooks';
import { listStagger } from '@/theme/motion';

type OptimizedListProps<T> = FlashListProps<T> & {
  estimatedItemSize: number;
};

/** FlashList wrapper with Autocore defaults */
function FlashListInner<T>({ contentContainerStyle, ...props }: OptimizedListProps<T>) {
  const dl = useDesignLanguage();

  return (
    <ShopifyFlashList
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      contentContainerStyle={[
        { paddingHorizontal: dl.layout.screenPadding.horizontal },
        contentContainerStyle,
      ]}
      {...props}
    />
  );
}

export const FlashList = memo(FlashListInner) as typeof FlashListInner;

export function useListStaggerDelay(index: number) {
  const dl = useDesignLanguage();
  return dl.staggerDelay(index, listStagger.baseMs);
}

export function useStableCallback<T extends (...args: never[]) => unknown>(fn: T): T {
  return useCallback(fn, [fn]) as T;
}
