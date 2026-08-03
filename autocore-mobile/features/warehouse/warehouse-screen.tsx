import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, RefreshControl, View } from 'react-native';

import { BoxIcon } from '@/assets/icons';
import { EmptyState, FlashList, ListSkeleton, Screen, SearchInput, Text, toast } from '@/components/ui';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import { openSearchResult } from '@/features/search/lib/open-result';
import { mapInventoryItemToSearchResult, inventoryMatchesQuery } from '@/lib/search/map-inventory-to-search';
import { isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import {
  useCompanyModuleEnabled,
  useOptimisticStockAdjust,
  useRealtimeReconnect,
  useSession,
} from '@/hooks';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { isRealtimeReady } from '@/lib/realtime/subscription-registry';
import { normalizeInventoryItem } from '@/services/firestore/inventory-item-repository';
import type { InventoryItem } from '@/types/inventory';

import { WarehouseFilterBar, type WarehouseFilter } from './components/warehouse-filter-bar';
import { WarehouseHeader } from './components/warehouse-header';
import { WarehouseItemRow } from './components/warehouse-item-row';
import { WarehouseStatsRow } from './components/warehouse-stats-row';
import { wh } from './layout';

export function WarehouseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lowStock?: string; q?: string }>();
  const { profile, can } = useSession();
  const companyId = profile?.companyId?.trim() || null;
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const canView = can('inventory_view') && warehouseEnabled;
  const canEdit = can('inventory_edit') && warehouseEnabled;
  // Mirror SessionRealtimeHead — do not open a second inventory listener here.
  const inventoryRaw = useSessionQueryData<InventoryItem[]>(
    ['realtime', 'inventory-items', companyId],
    Boolean(companyId) && canView,
    [],
  );
  const items = useMemo(
    () => inventoryRaw.map(normalizeInventoryItem),
    [inventoryRaw],
  );
  const isBootstrapping =
    Boolean(companyId) &&
    canView &&
    items.length === 0 &&
    !isRealtimeReady(['realtime', 'inventory-items', companyId]);
  const errorMessage: string | null = null;
  const addToOrderFlow = useAddToOrderFlow();
  const { getDisplayAvailable, adjust, flush } = useOptimisticStockAdjust(companyId);
  const reconnectRealtime = useRealtimeReconnect();

  const [query, setQuery] = useState(() => (typeof params.q === 'string' ? params.q : ''));
  const [filter, setFilter] = useState<WarehouseFilter>(params.lowStock === '1' ? 'low' : 'all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void flush();
      };
    }, [flush]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        void flush();
      }
    });
    return () => subscription.remove();
  }, [flush]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void flush()
      .catch(() => undefined)
      .finally(() => {
        reconnectRealtime(companyId ? [['realtime', 'inventory-items', companyId]] : undefined);
        setRefreshing(false);
      });
  }, [companyId, flush, reconnectRealtime]);

  useEffect(() => {
    if (params.lowStock === '1') setFilter('low');
  }, [params.lowStock]);

  useEffect(() => {
    if (typeof params.q === 'string' && params.q.length > 0) {
      setQuery(params.q);
    }
  }, [params.q]);

  const activeItems = useMemo(
    () => items.filter((item) => item.status === 'active'),
    [items],
  );

  const stats = useMemo(() => {
    let lowStockCount = 0;
    let availableUnits = 0;
    for (const item of activeItems) {
      availableUnits += item.totalAvailable;
      if (isWarehouseLowStock(item)) lowStockCount += 1;
    }
    return { lowStockCount, availableUnits, total: activeItems.length };
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim();
    const needsFilter = filter === 'low' || trimmed.length > 0;
    const source = needsFilter
      ? activeItems.filter((item) => {
          if (filter === 'low' && !isWarehouseLowStock(item)) return false;
          if (trimmed && !inventoryMatchesQuery(item, trimmed)) return false;
          return true;
        })
      : activeItems;

    // Avoid full locale sort on every catalog snapshot when list is already usable.
    if (!needsFilter && source.length > 120) return source;
    return [...source].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }, [activeItems, filter, query]);

  const handleItemPress = useCallback(
    (itemId: string) => {
      const item = activeItems.find((entry) => entry.id === itemId);
      if (!item) return;
      void openSearchResult(mapInventoryItemToSearchResult(item), router, {
        addPart: addToOrderFlow.addPartToOrder,
        addMotor: addToOrderFlow.addMotorToOrder,
      });
    },
    [activeItems, addToOrderFlow.addMotorToOrder, addToOrderFlow.addPartToOrder, router],
  );

  const handleAdjustStock = useCallback(
    (itemId: string, delta: 1 | -1) => {
      if (!canEdit) {
        toast({
          title: 'No access',
          description: 'You need warehouse edit permission to change stock.',
          variant: 'warning',
        });
        return;
      }

      const item = activeItems.find((entry) => entry.id === itemId);
      if (!item) return;

      adjust(item, delta);
    },
    [activeItems, adjust, canEdit],
  );

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) => (
      <WarehouseItemRow
        item={item}
        available={getDisplayAvailable(item)}
        canEdit={canEdit}
        onPress={() => handleItemPress(item.id)}
        onAdjust={(delta) => handleAdjustStock(item.id, delta)}
      />
    ),
    [canEdit, getDisplayAvailable, handleAdjustStock, handleItemPress],
  );

  if (!canView) {
    return (
      <Screen>
        <EmptyState
          icon={BoxIcon}
          title="No access"
          description="Your role doesn't have permission to view the warehouse."
        />
      </Screen>
    );
  }

  if (!companyId || isBootstrapping) {
    return (
      <Screen>
        <ListSkeleton rows={8} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlashList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        drawDistance={280}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ gap: wh.section, paddingBottom: wh.section }}>
            <WarehouseHeader itemCount={stats.total} lowStockCount={stats.lowStockCount} />
            <WarehouseStatsRow
              availableUnits={stats.availableUnits}
              lowStockCount={stats.lowStockCount}
            />
            <View style={{ paddingHorizontal: wh.pad }}>
              <SearchInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name, SKU, bin…"
                returnKeyType="search"
              />
            </View>
            <WarehouseFilterBar value={filter} onChange={setFilter} />
            {errorMessage ? (
              <Text variant="caption" color="destructive" style={{ paddingHorizontal: wh.pad }}>
                {errorMessage}
              </Text>
            ) : null}
            {isBootstrapping && filteredItems.length === 0 ? (
              <View style={{ paddingHorizontal: wh.pad, paddingTop: 8 }}>
                <ListSkeleton rows={5} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isBootstrapping ? (
            <View style={{ paddingHorizontal: wh.pad, paddingTop: 24 }}>
              <EmptyState
                icon={BoxIcon}
                title={filter === 'low' ? 'All good' : 'Warehouse is empty'}
                description={
                  filter === 'low'
                    ? 'No items below the minimum stock level.'
                    : 'Add items by scanning or receiving stock.'
                }
              />
            </View>
          ) : null
        }
        renderItem={renderItem}
      />

      <OrderPickerSheet
        ref={addToOrderFlow.pickerRef}
        drafts={addToOrderFlow.drafts}
        onSelectNew={addToOrderFlow.handleSelectNew}
        onSelectOrder={addToOrderFlow.handleSelectOrder}
        onDismiss={addToOrderFlow.handlePickerDismiss}
      />
    </Screen>
  );
}
