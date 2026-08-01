import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, RefreshControl, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Loading, Screen, ScreenScroll, Text, toast } from '@/components/ui';
import { OrderPickerSheet } from '@/features/orders/components/order-picker-sheet';
import { useAddToOrderFlow } from '@/features/orders/hooks/use-add-to-order-flow';
import type { SearchEmptyActionId } from '@/features/search/components/search-empty-state';
import {
  SellMotorSheet,
  type SellMotorSheetRef,
} from '@/features/search/components/sell-motor-sheet';
import { orderStatusLabel } from '@/features/orders/lib/status';
import {
  useSession,
  useInventorySearch,
  useClientsRealtime,
  useWorkOrdersRealtime,
  useSearchIdleData,
  useMotorsRealtime,
  useCompanyModuleEnabled,
  useRealtimeReconnect,
} from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { rememberSearchQuery } from '@/lib/search/recent-queries';
import { isMotorStale, isWarehouseLowStock, motorMatchesSearchQuery } from '@/lib/inventory/is-low-stock';
import { joinSearchFields, matchesSearchQuery } from '@/lib/search/match-query';
import { mapInventoryItemToSearchResult } from '@/lib/search/map-inventory-to-search';
import { mapMotorToSearchResult } from '@/lib/search/map-motor-to-search';
import { rhythm } from '@/theme';

import { searchFilters } from './data/search-filters';
import { SearchBar } from './components/search-bar';
import { SearchFilters } from './components/search-filters';
import { SearchHeader } from './components/search-header';
import { SearchIdle } from './components/search-idle';
import { SearchResults } from './components/search-results';
import { searchLayout } from './layout';
import type { SearchFilterId, SearchResultGroup } from './types';

function parseFilter(value: string | string[] | undefined): SearchFilterId | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const allowed: SearchFilterId[] = ['all', 'parts', 'motors', 'clients', 'orders'];
  return allowed.includes(raw as SearchFilterId) ? (raw as SearchFilterId) : null;
}

export function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; filter?: string; lowStock?: string; stale?: string }>();
  const { profile, can, uid } = useSession();
  const rbac = useRbacPolicy();
  const companyId = profile?.companyId?.trim() || null;
  const motorsEnabled = useCompanyModuleEnabled('motors');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilterId>('all');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const initial = typeof params.q === 'string' ? params.q : '';
    if (initial) setQuery(initial);
    const nextFilter = parseFilter(params.filter);
    if (nextFilter) setFilter(nextFilter);
  }, [params.filter, params.q]);

  const trimmedQuery = query.trim();
  const deferredQuery = useDeferredValue(trimmedQuery);
  const hasQuery = trimmedQuery.length > 0;
  const lowStockOnly = params.lowStock === '1';
  const staleMotorsOnly = params.stale === '1';
  const showPresetList = lowStockOnly || staleMotorsOnly;

  const {
    results: inventoryResults,
    items: catalogItems,
    isBootstrapping: inventoryLoading,
  } = useInventorySearch(companyId, deferredQuery);
  const { clients, isBootstrapping: clientsLoading } = useClientsRealtime(companyId);
  const { orders, isBootstrapping: ordersLoading } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });
  const { availableMotors, isBootstrapping: motorsLoading } = useMotorsRealtime(
    companyId,
    uid,
    motorsEnabled,
  );
  const idleData = useSearchIdleData(companyId);
  const addToOrderFlow = useAddToOrderFlow();
  const sellSheetRef = useRef<SellMotorSheetRef>(null);
  const reconnectRealtime = useRealtimeReconnect();
  const [refreshing, setRefreshing] = useState(false);

  const refreshSearchData = useCallback(() => {
    if (!companyId) return;
    reconnectRealtime([
      ['realtime', 'inventory-items', companyId],
      ['realtime', 'clients', companyId],
      ['realtime', 'work-orders', companyId],
      ...(uid ? [['realtime', 'motors', companyId, uid] as const] : []),
    ]);
  }, [companyId, reconnectRealtime, uid]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshSearchData();
    idleData.refreshRecentQueries();
    setRefreshing(false);
  }, [idleData.refreshRecentQueries, refreshSearchData]);

  const handleSellMotor = useCallback(
    (motorId: string) => {
      const motor = availableMotors.find((entry) => entry.id === motorId);
      if (!motor) {
        toast({
          title: 'Motor not found',
          description: 'Refresh the list and try again',
          variant: 'destructive',
        });
        return;
      }
      sellSheetRef.current?.present(motor);
    },
    [availableMotors],
  );

  useFocusEffect(
    useCallback(() => {
      idleData.refreshRecentQueries();
    }, [idleData.refreshRecentQueries]),
  );

  useEffect(() => {
    if (!hasQuery) return;
    void rememberSearchQuery(trimmedQuery).then(idleData.syncRecentQueries);
  }, [hasQuery, idleData.syncRecentQueries, trimmedQuery]);

  const groups = useMemo<SearchResultGroup[]>(() => {
    const next: SearchResultGroup[] = [];

    if ((filter === 'all' || filter === 'parts') && can('inventory_view')) {
      let partItems = inventoryResults;

      if (lowStockOnly) {
        partItems = catalogItems
          .filter(isWarehouseLowStock)
          .map(mapInventoryItemToSearchResult)
          .slice(0, 40);
      }

      if (partItems.length > 0) {
        next.push({
          id: 'parts',
          title: lowStockOnly ? 'Running low' : 'Inventory',
          filter: 'parts',
          items: partItems,
        });
      }
    }

    if ((filter === 'all' || filter === 'motors') && motorsEnabled && can('inventory_view')) {
      const motorItems = availableMotors
        .filter((motor) => {
          if (staleMotorsOnly) return isMotorStale(motor);
          if (!hasQuery && !showPresetList) return false;
          return motorMatchesSearchQuery(motor, deferredQuery);
        })
        .slice(0, 20)
        .map(mapMotorToSearchResult);

      if (motorItems.length > 0) {
        next.push({
          id: 'motors',
          title: staleMotorsOnly ? 'Motors sitting long-term' : 'Motors',
          filter: 'motors',
          items: motorItems,
        });
      }
    }

    if ((filter === 'all' || filter === 'clients') && can('clients_manage') && hasQuery) {
      const items = clients
        .filter((client) =>
          matchesSearchQuery(
            joinSearchFields(client.fullName, client.email),
            deferredQuery,
            { phones: client.phone ? [client.phone] : [] },
          ),
        )
        .slice(0, 20)
        .map((client) => ({
          id: client.id,
          kind: 'client' as const,
          title: client.fullName,
          subtitle: client.phone,
          meta: client.email,
        }));
      if (items.length > 0) {
        next.push({ id: 'clients', title: 'Clients', filter: 'clients', items });
      }
    }

    if ((filter === 'all' || filter === 'orders') && can('work_orders_view') && hasQuery) {
      const items = orders
        .filter((order) =>
          matchesSearchQuery(
            joinSearchFields(
              order.number,
              order.customer,
              order.vehicle,
              order.engine,
              order.licensePlate,
            ),
            deferredQuery,
          ),
        )
        .slice(0, 20)
        .map((order) => ({
          id: order.id,
          kind: 'order' as const,
          title: order.number,
          subtitle: order.customer,
          meta: [order.vehicle, orderStatusLabel[order.status]].filter(Boolean).join(' · '),
        }));
      if (items.length > 0) {
        next.push({ id: 'orders', title: 'Work orders', filter: 'orders', items });
      }
    }

    return next;
  }, [
    availableMotors,
    can,
    catalogItems,
    clients,
    deferredQuery,
    filter,
    hasQuery,
    inventoryResults,
    lowStockOnly,
    motorsEnabled,
    orders,
    showPresetList,
    staleMotorsOnly,
  ]);

  const isBootstrapping = inventoryLoading || clientsLoading || ordersLoading || motorsLoading;
  const showInitialLoading = isBootstrapping && groups.length === 0 && (hasQuery || showPresetList);

  const handleEmptyAction = (action: SearchEmptyActionId) => {
    if (action === 'scan') {
      router.navigate('/(tabs)/scan');
      return;
    }
    if (action === 'new-order') {
      router.navigate('/(tabs)/orders/new');
      return;
    }
    if (action === 'parts-filter') {
      setFilter('parts');
      searchInputRef.current?.focus();
      return;
    }
    if (action === 'motors-filter') {
      setFilter('motors');
      searchInputRef.current?.focus();
    }
  };

  if (!companyId) {
    return (
      <Screen style={{ justifyContent: 'center', padding: rhythm.section }}>
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Select a workspace to search inventory, clients, and orders.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenScroll
        tabBarInset
        onScrollBeginDrag={Keyboard.dismiss}
        decelerationRate="normal"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SearchHeader onSettingsPress={() => router.navigate('/(tabs)/profile')} />

        <View style={{ paddingHorizontal: rhythm.pad, marginTop: rhythm.tight, gap: rhythm.stack, marginBottom: rhythm.tight }}>
          <SearchBar value={query} onChangeText={setQuery} inputRef={searchInputRef} />
          <SearchFilters filters={searchFilters} activeFilter={filter} onFilterChange={setFilter} />
        </View>

        <View>
          {hasQuery || showPresetList ? (
            showInitialLoading ? (
              <View style={{ paddingHorizontal: searchLayout.pad, paddingTop: rhythm.section }}>
                <Loading message="Searching…" />
              </View>
            ) : (
              <SearchResults
                key={`${deferredQuery}-${filter}-${lowStockOnly}-${staleMotorsOnly}`}
                query={trimmedQuery}
                groups={groups}
                onEmptyAction={handleEmptyAction}
                addToOrder={{
                  addPart: addToOrderFlow.addPartToOrder,
                  addMotor: addToOrderFlow.addMotorToOrder,
                }}
                motorActions={{
                  onSell: handleSellMotor,
                  addToOrder: (motorId) => addToOrderFlow.addMotorToOrder(motorId, 'install'),
                }}
              />
            )
          ) : (
            <SearchIdle
              recentQueries={idleData.recentQueries}
              recentlyViewed={idleData.recentlyViewed}
              recentMotors={idleData.recentMotors}
              quickCategories={idleData.quickCategories}
              isBootstrapping={idleData.isBootstrapping}
              hasData={idleData.hasInventory || idleData.recentQueries.length > 0}
              motorsEnabled={idleData.motorsEnabled}
              onRecentPress={(value) => {
                setQuery(value);
                setFilter('all');
              }}
              onCategoryPress={(nextFilter) => {
                setFilter(nextFilter);
                searchInputRef.current?.focus();
              }}
              onMotorPress={(motorId) => {
                setQuery(motorId);
                setFilter('motors');
              }}
            />
          )}
        </View>
      </ScreenScroll>
      <OrderPickerSheet
        ref={addToOrderFlow.pickerRef}
        drafts={addToOrderFlow.drafts}
        onSelectNew={addToOrderFlow.handleSelectNew}
        onSelectOrder={addToOrderFlow.handleSelectOrder}
        onDismiss={addToOrderFlow.handlePickerDismiss}
      />
      {companyId && uid ? (
        <SellMotorSheet
          ref={sellSheetRef}
          companyId={companyId}
          uid={uid}
          userId={profile?.id ?? uid}
          onSold={(motor) => {
            toast({
              title: 'Motor sold',
              description: motor.serialCode,
              variant: 'success',
            });
          }}
        />
      ) : null}
    </Screen>
  );
}
