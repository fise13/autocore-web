import { useMutation } from '@tanstack/react-query';

import { mobileApi } from '@/services/api/endpoints';
import { mobilePost } from '@/services/api/mobile-client';
import type { MobileQuickReceiveResult } from '@/types/inventory';

export function useMobileQuickReceive() {
  return useMutation({
    mutationFn: async (input: { itemId: string; quantity?: number; warehouseId?: string }) => {
      return mobilePost<MobileQuickReceiveResult>(mobileApi.inventoryQuickReceive, {
        itemId: input.itemId,
        quantity: input.quantity ?? 1,
        warehouseId: input.warehouseId,
      });
    },
  });
}
