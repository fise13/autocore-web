import { useEffect, useMemo, useState } from 'react';

import type { QuickCategory, SearchEngine } from '@/features/search/types';
import { useInventoryCatalog } from '@/hooks/use-inventory-catalog';
import { readRecentSearchQueries } from '@/lib/search/recent-queries';
import { mapInventoryItemToSearchEngine } from '@/lib/search/map-inventory-to-search';

const QUICK_CATEGORIES: QuickCategory[] = [
  { id: 'parts', label: 'Склад' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'orders', label: 'Заказы' },
];

export function useSearchIdleData(companyId: string | null | undefined) {
  const { items, isBootstrapping, enabled } = useInventoryCatalog(companyId);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  useEffect(() => {
    void readRecentSearchQueries().then(setRecentQueries);
  }, []);

  const recentlyViewed = useMemo<SearchEngine[]>(() => {
    return items
      .filter((item) => item.status === 'active')
      .slice()
      .sort((left, right) => (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0))
      .slice(0, 6)
      .map(mapInventoryItemToSearchEngine);
  }, [items]);

  return {
    recentQueries,
    recentlyViewed,
    quickCategories: QUICK_CATEGORIES,
    isBootstrapping,
    enabled,
    hasInventory: items.length > 0,
  };
}
