import { useEffect, useMemo, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Loading, Text } from '@/components/ui';
import {
  useTheme,
  useSession,
  useInventorySearch,
  useClientsRealtime,
  useWorkOrdersRealtime,
  useSearchIdleData,
} from '@/hooks';
import { rememberSearchQuery } from '@/lib/search/recent-queries';

import { searchFilters } from './data/search-filters';
import { SearchBar } from './components/search-bar';
import { SearchFilters } from './components/search-filters';
import { SearchHeader } from './components/search-header';
import { SearchIdle } from './components/search-idle';
import { SearchResults } from './components/search-results';
import { searchLayout } from './layout';
import type { SearchFilterId, SearchResultGroup } from './types';

export function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { profile, can } = useSession();
  const companyId = profile?.companyId?.trim() || null;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilterId>('all');

  useEffect(() => {
    const initial = typeof params.q === 'string' ? params.q : '';
    if (initial) setQuery(initial);
  }, [params.q]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const { results: inventoryResults, isBootstrapping: inventoryLoading } = useInventorySearch(
    companyId,
    trimmedQuery,
  );
  const { clients, isBootstrapping: clientsLoading } = useClientsRealtime(companyId);
  const { orders, isBootstrapping: ordersLoading } = useWorkOrdersRealtime(companyId);
  const idleData = useSearchIdleData(companyId);

  useEffect(() => {
    if (!hasQuery) return;
    void rememberSearchQuery(trimmedQuery);
  }, [hasQuery, trimmedQuery]);

  const groups = useMemo<SearchResultGroup[]>(() => {
    if (!hasQuery) return [];
    const q = trimmedQuery.toLowerCase();
    const next: SearchResultGroup[] = [];

    if ((filter === 'all' || filter === 'parts') && can('inventory_view')) {
      const items = inventoryResults;
      if (items.length > 0) {
        next.push({ id: 'parts', title: 'Склад', filter: 'parts', items });
      }
    }

    if ((filter === 'all' || filter === 'clients') && can('clients_manage')) {
      const items = clients
        .filter((client) => [client.fullName, client.phone, client.email].filter(Boolean).join(' ').toLowerCase().includes(q))
        .slice(0, 20)
        .map((client) => ({
          id: client.id,
          kind: 'client' as const,
          title: client.fullName,
          subtitle: client.phone,
          meta: client.email,
        }));
      if (items.length > 0) {
        next.push({ id: 'clients', title: 'Клиенты', filter: 'clients', items });
      }
    }

    if ((filter === 'all' || filter === 'orders') && can('work_orders_view')) {
      const items = orders
        .filter((order) =>
          [order.number, order.customer, order.vehicle, order.engine, order.licensePlate]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
        .slice(0, 20)
        .map((order) => ({
          id: order.id,
          kind: 'order' as const,
          title: order.number,
          subtitle: order.customer,
          meta: order.vehicle,
          status: order.status === 'completed' ? ('sold' as const) : ('in_stock' as const),
        }));
      if (items.length > 0) {
        next.push({ id: 'orders', title: 'Заказы', filter: 'orders', items });
      }
    }

    return next;
  }, [can, clients, filter, hasQuery, inventoryResults, orders, trimmedQuery]);

  const isSearching = inventoryLoading || clientsLoading || ordersLoading;

  if (!companyId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }}>
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Выберите рабочее пространство, чтобы искать по складу, клиентам и заказам.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 12) + 88,
        }}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <SearchHeader onSettingsPress={() => router.navigate('/(tabs)/profile')} />
        <View style={{ gap: 14 }}>
          <SearchBar value={query} onChangeText={setQuery} />
          <SearchFilters filters={searchFilters} activeFilter={filter} onFilterChange={setFilter} />
        </View>

        <View style={{ paddingTop: searchLayout.section }}>
          {hasQuery ? (
            isSearching && groups.length === 0 ? (
              <View style={{ paddingHorizontal: searchLayout.pad, paddingTop: 24 }}>
                <Loading message="Ищем в базе…" />
              </View>
            ) : (
              <SearchResults key={`${trimmedQuery}-${filter}`} query={trimmedQuery} groups={groups} />
            )
          ) : (
            <SearchIdle
              recentQueries={idleData.recentQueries}
              recentlyViewed={idleData.recentlyViewed}
              quickCategories={idleData.quickCategories}
              isBootstrapping={idleData.isBootstrapping}
              hasData={idleData.hasInventory}
              onRecentPress={(value) => {
                setQuery(value);
                setFilter('all');
              }}
              onCategoryPress={(nextFilter) => {
                setFilter(nextFilter);
              }}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
