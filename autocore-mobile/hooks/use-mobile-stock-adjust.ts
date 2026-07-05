import { useMutation } from '@tanstack/react-query';

import { mobileApi } from '@/services/api/endpoints';
import { mobilePost } from '@/services/api/mobile-client';
import type { MobileQuickAdjustResult } from '@/types/inventory';

export function useMobileStockAdjust() {
  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      direction: 'increase' | 'decrease';
      quantity?: number;
      warehouseId?: string;
      idempotencyKey?: string;
    }) => {
      return mobilePost<MobileQuickAdjustResult>(mobileApi.inventoryQuickAdjust, {
        itemId: input.itemId,
        direction: input.direction,
        quantity: input.quantity ?? 1,
        warehouseId: input.warehouseId,
        idempotencyKey: input.idempotencyKey,
      });
    },
  });
}
