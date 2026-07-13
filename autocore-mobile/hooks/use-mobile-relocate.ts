import { useMutation, useQuery } from '@tanstack/react-query';

import { mobileApi } from '@/services/api/endpoints';
import { mobileGet, mobilePost } from '@/services/api/mobile-client';

export type MobileWarehouseLocation = {
  id: string;
  warehouseId: string;
  displayCode: string;
  code: string;
  isSystem?: boolean;
  type: string;
};

export type MobileRelocateResult = {
  movementId: string;
  warehouseId: string;
  fromLocationId: string;
  toLocationId: string;
  toLocationCode: string;
  quantity: number;
  primaryLocationCode: string;
};

export type MobileAssignAssetResult = {
  entityType: 'motor' | 'specific';
  entityId: string;
  warehouseId: string;
  toLocationId: string;
  toLocationCode: string;
  primaryLocationCode: string;
};

export function useMobileWarehouseLocations(warehouseId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['mobile', 'warehouseLocations', warehouseId],
    enabled: Boolean(warehouseId && enabled),
    queryFn: async () => {
      const response = await mobileGet<{ locations: MobileWarehouseLocation[] }>(
        `${mobileApi.inventoryLocations}?warehouseId=${encodeURIComponent(warehouseId!)}`,
      );
      return response.locations;
    },
    staleTime: 30_000,
  });
}

export function useMobileRelocate() {
  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      warehouseId?: string;
      toLocationId?: string;
      toLocationCode?: string;
      fromLocationId?: string;
      quantity?: number;
      idempotencyKey?: string;
      reason?: string;
    }) => {
      return mobilePost<MobileRelocateResult>(mobileApi.inventoryRelocate, input);
    },
  });
}

export function useMobileAssignAssetLocation() {
  return useMutation({
    mutationFn: async (input: {
      entityType: 'motor' | 'specific';
      entityId: string;
      toLocationId?: string;
      toLocationCode?: string;
      warehouseId?: string;
    }) => {
      return mobilePost<MobileAssignAssetResult>(mobileApi.assetsAssignLocation, input);
    },
  });
}
