import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, RefreshControl, View } from 'react-native';

import { BoxIcon } from '@/assets/icons';
import { EmptyState, FlashList, Screen, SearchInput, Text, toast } from '@/components/ui';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import { openSearchResult } from '@/features/search/lib/open-result';
import { mapInventoryItemToSearchResult, inventoryMatchesQuery } from '@/lib/search/map-inventory-to-search';
import { isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import {
  useCompanyModuleEnabled,
  useInventoryCatalog,
  useOptimisticStockAdjust,
  useRealtimeReconnect,
  useSession,
} from '@/hooks';

import { WarehouseFilterBar, type WarehouseFilter } from './components/warehouse-filter-bar';
import { WarehouseHeader } from './components/warehouse-header';
import { WarehouseItemRow } from './components/warehouse-item-row';
import { WarehouseStatsRow } from './components/warehouse-stats-row';
import { wh } from './layout';

export function WarehouseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lowStock?: string }>();
  const { profile, can } = useSession();
  const companyId = profile?.companyId?.trim() || null;
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const canView = can('inventory_view') && warehouseEnabled;
  const canEdit = can('inventory_edit') && warehouseEnabled;
  const { items, isBootstrapping, errorMessage } = useInventoryCatalog(companyId, { keepAlive: true });
  const addToOrderFlow = useAddToOrderFlow();
  const { getDisplayAvailable, adjust, flush } = useOptimisticStockAdjust(companyId);
  const reconnectRealtime = useRealtimeReconnect();

  const [query, setQuery] = useState('');
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

  const activeItems = useMemo(
    () => items.filter((item) => item.status === 'active'),
    [items],
  );

  const stats = useMemo(() => {
    const lowStockCount = activeItems.filter(isWarehouseLowStock).length;
    const availableUnits = activeItems.reduce((sum, item) => sum + item.totalAvailable, 0);
    return { lowStockCount, availableUnits, total: activeItems.length };
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim();
    return activeItems
      .filter((item) => (filter === 'low' ? isWarehouseLowStock(item) : true))
      .filter((item) => (trimmed ? inventoryMatchesQuery(item, trimmed) : true))
      .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
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
          title: 'Нет доступа',
          description: 'Для изменения остатка нужно право редактирования склада.',
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

  if (!companyId) {
    return (
      <Screen>
        <EmptyState
          icon={BoxIcon}
          title="Нет рабочего пространства"
          description="Выберите компанию, чтобы видеть склад и остатки."
        />
      </Screen>
    );
  }

  if (!canView) {
    return (
      <Screen>
        <EmptyState
          icon={BoxIcon}
          title="Нет доступа"
          description="У вашей роли нет прав на просмотр склада."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlashList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
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
                placeholder="Поиск по названию, SKU, ячейке…"
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
              <Text variant="caption" color="muted" style={{ paddingHorizontal: wh.pad }}>
                Загружаем склад…
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isBootstrapping ? (
            <View style={{ paddingHorizontal: wh.pad, paddingTop: 24 }}>
              <EmptyState
                icon={BoxIcon}
                title={filter === 'low' ? 'Всё в норме' : 'Склад пуст'}
                description={
                  filter === 'low'
                    ? 'Нет позиций ниже минимального остатка.'
                    : 'Добавьте товары через сканирование или приёмку.'
                }
              />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <WarehouseItemRow
            item={item}
            index={index}
            available={getDisplayAvailable(item)}
            canEdit={canEdit}
            onPress={() => handleItemPress(item.id)}
            onAdjust={(delta) => handleAdjustStock(item.id, delta)}
          />
        )}
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
