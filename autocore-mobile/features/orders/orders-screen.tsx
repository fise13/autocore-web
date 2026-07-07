import { useCallback, useMemo, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ListRenderItemInfo } from '@shopify/flash-list';

import { ClipboardListIcon } from '@/assets/icons';
import { EmptyState, FlashList, Screen, Text, toast } from '@/components/ui';
import { useSession, useWorkOrdersRealtime, useModuleEnabled, useFloatingTabBarInset } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { filterMobileOrders, computeMobileOrdersMeta } from '@/lib/work-order/map-to-mobile-card';
import { transitionWorkOrder } from '@/services/api/work-orders';
import { haptics, rhythm } from '@/theme';
import { openPhone } from '@/utils/open-phone';

import { orderFilters } from './data/mock-orders';
import { OrderCard } from './components/order-card';
import { OrdersLoadingState } from './components/order-card-skeleton';
import { OrdersFilters } from './components/orders-filters';
import { OrdersHeader } from './components/orders-header';
import { OrdersPrimaryAction } from './components/orders-primary-action';
import { OrdersSearch } from './components/orders-search';
import { ordersLayout } from './layout';
import type { OrderFilterId, WorkOrder } from './types';

export function OrdersScreen() {
  const router = useRouter();
  const { scrollBottom } = useFloatingTabBarInset();
  const { companyId, profile, can, uid } = useSession();
  const rbac = useRbacPolicy();
  const workOrdersEnabled = useModuleEnabled('workOrders');
  const { orders, isBootstrapping, errorMessage, enabled } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderFilterId>('open');

  const meta = useMemo(() => computeMobileOrdersMeta(orders), [orders]);

  const filteredOrders = useMemo(
    () => filterMobileOrders(orders, filter, query),
    [filter, orders, query],
  );

  const canCreate = can('work_orders_edit') && workOrdersEnabled;
  const canEdit = can('work_orders_edit');

  const openOrder = useCallback(
    (order: WorkOrder) => {
      router.push(`/(tabs)/orders/${order.id}`);
    },
    [router],
  );

  const markReady = useCallback(
    async (order: WorkOrder) => {
      if (!canEdit) {
        toast({ title: 'Нет прав на изменение наряда', variant: 'warning' });
        return;
      }
      if (order.status === 'completed' || order.status === 'ready') {
        openOrder(order);
        return;
      }
      try {
        haptics.medium();
        await transitionWorkOrder(order.id, 'completed');
        haptics.success();
        toast({ title: 'Наряд отмечен выполненным', variant: 'success' });
      } catch (error) {
        haptics.warning();
        toast({
          title: 'Не удалось обновить статус',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [canEdit, openOrder],
  );

  const callCustomer = useCallback(async (order: WorkOrder) => {
    haptics.light();
    await openPhone(order.phone);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<WorkOrder>) => (
      <View style={{ paddingHorizontal: ordersLayout.pad, marginBottom: rhythm.inline }}>
        <OrderCard order={item} index={index} onMarkReady={markReady} onCall={callCustomer} />
      </View>
    ),
    [callCustomer, markReady],
  );

  const keyExtractor = useCallback((item: WorkOrder) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View>
        <OrdersHeader meta={meta} />
        {canCreate ? (
          <OrdersPrimaryAction onPress={() => router.push('/(tabs)/orders/new')} />
        ) : null}
        <View style={{ gap: rhythm.stack, marginTop: rhythm.stack }}>
          <OrdersSearch value={query} onChangeText={setQuery} />
          <OrdersFilters filters={orderFilters} activeFilter={filter} onFilterChange={setFilter} />
        </View>
        {errorMessage ? (
          <Text
            variant="caption"
            color="destructive"
            style={{ paddingHorizontal: ordersLayout.pad, marginTop: rhythm.inline }}
          >
            {errorMessage}
          </Text>
        ) : null}
        <View style={{ height: ordersLayout.section }} />
      </View>
    ),
    [canCreate, errorMessage, filter, meta, query, router],
  );

  const listEmpty = useMemo(
    () => (
      <View style={{ paddingHorizontal: ordersLayout.pad }}>
        {isBootstrapping && orders.length === 0 ? (
          <OrdersLoadingState />
        ) : (
          <EmptyState
            icon={ClipboardListIcon}
            title={orders.length === 0 ? 'Нарядов пока нет' : 'Ничего не найдено'}
            description={
              orders.length === 0
                ? 'Создайте первый заказ-наряд — это займёт меньше минуты.'
                : 'Измените фильтр или поисковый запрос.'
            }
            primaryAction={
              canCreate && orders.length === 0
                ? {
                    label: 'Создать наряд',
                    onPress: () => router.push('/(tabs)/orders/new'),
                  }
                : query
                  ? {
                      label: 'Сбросить поиск',
                      onPress: () => {
                        setQuery('');
                        setFilter('open');
                      },
                      variant: 'outline',
                    }
                  : undefined
            }
          />
        )}
      </View>
    ),
    [canCreate, filter, isBootstrapping, orders.length, query, router],
  );

  if (!enabled || !profile?.companyId) {
    return (
      <Screen style={{ justifyContent: 'center', paddingHorizontal: ordersLayout.pad }}>
        <EmptyState
          icon={ClipboardListIcon}
          title="Нет рабочего пространства"
          description="Выберите компанию в профиле, чтобы видеть заказ-наряды."
          primaryAction={{
            label: 'Открыть профиль',
            onPress: () => router.navigate('/(tabs)/profile'),
          }}
        />
      </Screen>
    );
  }

  if (!can('work_orders_view')) {
    return (
      <Screen style={{ justifyContent: 'center', paddingHorizontal: ordersLayout.pad }}>
        <EmptyState
          icon={ClipboardListIcon}
          title="Нет доступа"
          description="У вашей роли нет прав на просмотр заказ-нарядов."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlashList
        data={filteredOrders}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: scrollBottom }}
        onScrollBeginDrag={Keyboard.dismiss}
        keyboardDismissMode="on-drag"
      />
    </Screen>
  );
}
