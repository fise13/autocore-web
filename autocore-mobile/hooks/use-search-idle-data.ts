import { useCallback, useEffect, useMemo, useState } from 'react';

import type { QuickCategory, SearchEngine } from '@/features/search/types';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useInventoryCatalog } from '@/hooks/use-inventory-catalog';
import { useMotorsRealtime } from '@/hooks/use-motors-realtime';
import { useSession } from '@/hooks/use-session';
import { coerceToDate } from '@/lib/firestore-timestamp';
import { getRecentQueriesCache, readRecentSearchQueries } from '@/lib/search/recent-queries';
import { mapInventoryItemToSearchEngine } from '@/lib/search/map-inventory-to-search';
import { mapMotorToSearchResult } from '@/lib/search/map-motor-to-search';

const QUICK_CATEGORIES: QuickCategory[] = [
  { id: 'parts', label: 'Склад' },
  { id: 'motors', label: 'Моторы' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'orders', label: 'Заказы' },
];

export function useSearchIdleData(companyId: string | null | undefined) {
  const { uid } = useSession();
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const { items, isBootstrapping, enabled } = useInventoryCatalog(companyId);
  const { availableMotors } = useMotorsRealtime(companyId, uid, motorsEnabled);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => getRecentQueriesCache());

  const refreshRecentQueries = useCallback(() => {
    void readRecentSearchQueries().then(setRecentQueries);
  }, []);

  const syncRecentQueries = useCallback((queries: string[]) => {
    setRecentQueries(queries);
  }, []);

  useEffect(() => {
    refreshRecentQueries();
  }, [refreshRecentQueries]);

  const recentlyViewed = useMemo<SearchEngine[]>(() => {
    return items
      .filter((item) => item.status === 'active')
      .slice()
      .sort(
        (left, right) =>
          (coerceToDate(right.updatedAt)?.getTime() ?? 0) -
          (coerceToDate(left.updatedAt)?.getTime() ?? 0),
      )
      .slice(0, 6)
      .map(mapInventoryItemToSearchEngine);
  }, [items]);

  const recentMotors = useMemo(() => {
    if (!motorsEnabled) return [];
    return availableMotors.slice(0, 4).map(mapMotorToSearchResult);
  }, [availableMotors, motorsEnabled]);

  const quickCategories = useMemo(() => {
    if (motorsEnabled) return QUICK_CATEGORIES;
    return QUICK_CATEGORIES.filter((c) => c.id !== 'motors');
  }, [motorsEnabled]);

  return {
    recentQueries,
    recentlyViewed,
    recentMotors,
    quickCategories,
    isBootstrapping,
    enabled,
    hasInventory: items.length > 0,
    motorsEnabled,
    refreshRecentQueries,
    syncRecentQueries,
  };
}
