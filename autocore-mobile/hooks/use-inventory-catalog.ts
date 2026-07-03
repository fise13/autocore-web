import { useMemo } from 'react';

import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { isProductionCompanyId } from '@/lib/company-id';
import { inventoryMatchesQuery, mapInventoryItemToSearchResult } from '@/lib/search/map-inventory-to-search';
import { inventoryItemRepository } from '@/services/firestore/inventory-item-repository';
import type { InventoryItem } from '@/types/inventory';

export function useInventoryCatalog(companyId: string | null | undefined) {
  const enabled = isProductionCompanyId(companyId);

  const { data, isBootstrapping, errorMessage } = useRealtimeQuery<InventoryItem[]>({
    queryKey: ['realtime', 'inventory-items', companyId],
    enabled,
    initialData: [],
    subscribe: (onData, onError) => {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      return inventoryItemRepository.subscribe(
        companyId,
        onData,
        (error) => onError({ message: error.message }),
      );
    },
  });

  return {
    items: data,
    isBootstrapping,
    errorMessage,
    enabled,
  };
}

export function useInventorySearch(companyId: string | null | undefined, query: string) {
  const { items, isBootstrapping, errorMessage, enabled } = useInventoryCatalog(companyId);
  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmed) return [];
    return items
      .filter((item) => item.status === 'active')
      .filter((item) => inventoryMatchesQuery(item, trimmed))
      .slice(0, 40)
      .map(mapInventoryItemToSearchResult);
  }, [items, trimmed]);

  return { results, isBootstrapping, errorMessage, enabled };
}
