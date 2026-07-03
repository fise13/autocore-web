import { useMemo, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Loading } from '@/components/ui';
import { useTheme, useSession, useWorkOrdersRealtime, useModuleEnabled } from '@/hooks';
import { filterMobileOrders, computeMobileOrdersMeta } from '@/lib/work-order/map-to-mobile-card';

import { orderFilters } from './data/mock-orders';
import { OrderCard } from './components/order-card';
import { OrdersFilters } from './components/orders-filters';
import { OrdersHeader } from './components/orders-header';
import { OrdersPrimaryAction } from './components/orders-primary-action';
import { OrdersSearch } from './components/orders-search';
import { ordersLayout } from './layout';
import type { OrderFilterId, WorkOrder } from './types';

export function OrdersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { companyId, profile, can } = useSession();
  const workOrdersEnabled = useModuleEnabled('workOrders');
  const { orders, isBootstrapping, errorMessage, enabled } = useWorkOrdersRealtime(companyId);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderFilterId>('open');

  const meta = useMemo(() => computeMobileOrdersMeta(orders), [orders]);

  const filteredOrders = useMemo(
    () => filterMobileOrders(orders, filter, query),
    [filter, orders, query],
  );

  const canCreate = can('work_orders_edit') && workOrdersEnabled;

  const openOrder = (order: WorkOrder) => {
    router.push(`/(tabs)/orders/${order.id}`);
  };

  if (!enabled || !profile?.companyId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }}>
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Выберите рабочее пространство, чтобы видеть заказ-наряды.
        </Text>
      </View>
    );
  }

  if (!can('work_orders_view')) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 }}>
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Нет прав на просмотр заказ-нарядов.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isBootstrapping ? <Loading message="Загружаем наряды…" /> : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        onScrollBeginDrag={Keyboard.dismiss}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 12) + 88,
        }}
      >
        <OrdersHeader meta={meta} />
        {canCreate ? (
          <OrdersPrimaryAction onPress={() => router.push('/(tabs)/orders/new')} />
        ) : null}

        <View style={{ gap: 12, marginTop: 16 }}>
          <OrdersSearch value={query} onChangeText={setQuery} />
          <OrdersFilters filters={orderFilters} activeFilter={filter} onFilterChange={setFilter} />
        </View>

        {errorMessage ? (
          <Text variant="caption" color="destructive" style={{ paddingHorizontal: ordersLayout.pad, marginTop: 8 }}>
            {errorMessage}
          </Text>
        ) : null}

        <View style={{ marginTop: ordersLayout.section, paddingHorizontal: ordersLayout.pad, gap: 10 }}>
          {filteredOrders.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 6 }}>
              <Text variant="body" color="muted" style={{ fontSize: 14 }}>
                {orders.length === 0 ? 'Нарядов пока нет' : 'Ничего не найдено'}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                onMarkReady={openOrder}
                onCall={openOrder}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
