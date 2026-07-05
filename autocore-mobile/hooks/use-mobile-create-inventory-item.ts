import { useMutation } from '@tanstack/react-query';

import { mobileApi } from '@/services/api/endpoints';
import { mobilePost } from '@/services/api/mobile-client';
import type { MobileCreateInventoryItemResult } from '@/types/inventory';

export type CreateInventoryItemInput = {
  barcode: string;
  sku?: string;
  name: string;
  brandName?: string;
  warehouseLocation?: string;
  unit?: string;
  sellPrice?: number;
  purchasePrice?: number;
  initialQuantity?: number;
};

export function useMobileCreateInventoryItem() {
  return useMutation({
    mutationFn: async (input: CreateInventoryItemInput) => {
      return mobilePost<MobileCreateInventoryItemResult>(mobileApi.inventoryCreateItem, input);
    },
  });
}
