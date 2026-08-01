import { useCallback, useMemo, useState } from 'react';
import { Keyboard, View } from 'react-native';
import type { NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { ListRenderItemInfo } from '@shopify/flash-list';

import { ClipboardListIcon } from '@/assets/icons';
import { EmptyState, FlashList, Screen, ScreenGate, Text, toast } from '@/components/ui';
import { useSession, useWorkOrdersRealtime, useModuleEnabled, useTheme } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import {
  filterMobileOrders,
  computeMobileOrdersMeta,
  computeMobileFilterCounts,
} from '@/lib/work-order/map-to-mobile-card';
import { transitionWorkOrder } from '@/services/api/work-orders';
import { haptics } from '@/theme';
import { openPhone } from '@/utils/open-phone';

import { orderFilters } from './data/mock-orders';
import { OrderCard } from './components/order-card';
import { OrdersLoadingState } from './components/order-card-skeleton';
import { OrdersFilters } from './components/orders-filters';
import { OrdersAvatarButton } from './components/orders-header-actions';
import { OrdersCreateFab, ordersFabScrollClearance } from './components/orders-create-fab';
import { OrdersSummary } from './components/orders-summary';
import { buildOrderRows, type OrdersRow } from './lib/group-orders';
import { wo, woType } from './theme/wo-visual';
import type { OrderFilterId, WorkOrder } from './types';

const FILTER_IDS = orderFilters.map((filter) => filter.id);

function OrdersGroupHeader({ label, count }: { label: string; count: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: wo.pad,
        paddingTop: wo.stackGap,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text variant="meta" style={{ ...woType.groupHeader, color: colors.mutedForeground }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: wo.rule, backgroundColor: colors.border }} />
      <Text
        variant="meta"
        style={{ ...woType.meta, color: colors.mutedForeground, fontVariant: ['tabular-nums'] }}
      >
        {count}
      </Text>
    </View>
  );
}

export function OrdersScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { companyId, profile, can, uid } = useSession();
  const rbac = useRbacPolicy();
  const workOrdersEnabled = useModuleEnabled('workOrders');
  const canCreate = can('work_orders_edit') && workOrdersEnabled;
  const canEdit = can('work_orders_edit');

  const { orders, isBootstrapping, errorMessage, enabled } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderFilterId>('open');

  const meta = useMemo(() => computeMobileOrdersMeta(orders), [orders]);
  const filterCounts = useMemo(() => computeMobileFilterCounts(orders, FILTER_IDS), [orders]);

  const filteredOrders = useMemo(
    () => filterMobileOrders(orders, filter, query),
    [filter, orders, query],
  );

  const rows = useMemo(() => buildOrderRows(filteredOrders), [filteredOrders]);

  /** Native `UISearchBar` under the large title — same options object each render. */
  const screenOptions = useMemo(
    () => ({
      // The app carries its own theme toggle while `userInterfaceStyle` is
      // `automatic`, so native chrome has to be told which one to match —
      // otherwise the bar renders light over a dark app.
      headerBlurEffect: isDark ? ('systemChromeMaterialDark' as const) : ('systemChromeMaterialLight' as const),
      headerTintColor: colors.primary,
      headerTitleStyle: { color: colors.foreground },
      headerLargeTitleStyle: { color: colors.foreground },
      headerSearchBarOptions: {
        placeholder: 'Customer, WO #, vehicle',
        autoCapitalize: 'none' as const,
        hideWhenScrolling: false,
        tintColor: colors.primary,
        onChangeText: (event: NativeSyntheticEvent<TextInputFocusEventData>) =>
          setQuery(event.nativeEvent.text),
        onCancelButtonPress: () => setQuery(''),
      },
      headerLeft: () => <OrdersAvatarButton />,
    }),
    [colors.foreground, colors.primary, isDark],
  );

  const markComplete = useCallback(
    async (order: WorkOrder) => {
      if (!canEdit) {
        toast({ title: 'You do not have permission to edit this work order', variant: 'warning' });
        return;
      }
      if (order.status === 'completed' || order.status === 'delivered' || order.status === 'cancelled') {
        router.push(`/(tabs)/orders/${order.id}`);
        return;
      }
      try {
        haptics.medium();
        await transitionWorkOrder(order.id, 'completed');
        haptics.success();
        toast({ title: 'Work order completed', variant: 'success' });
      } catch (error) {
        haptics.warning();
        toast({
          title: 'Failed to update status',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [canEdit, router],
  );

  const callCustomer = useCallback(async (order: WorkOrder) => {
    haptics.light();
    await openPhone(order.phone);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OrdersRow>) => {
      if (item.kind === 'header') {
        return <OrdersGroupHeader label={item.label} count={item.count} />;
      }
      return (
        <View style={{ paddingHorizontal: wo.pad, marginBottom: wo.rowGap }}>
          <OrderCard
            order={item.order}
            index={item.index}
            onComplete={markComplete}
            onCall={callCustomer}
          />
        </View>
      );
    },
    [callCustomer, markComplete],
  );

  const keyExtractor = useCallback((item: OrdersRow) => item.id, []);
  const getItemType = useCallback((item: OrdersRow) => item.kind, []);

  const listHeader = useMemo(
    () => (
      <View style={{ paddingTop: wo.stackGap }}>
        <OrdersSummary meta={meta} />
        <OrdersFilters
          filters={orderFilters}
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={filterCounts}
        />
        {errorMessage ? (
          <Text
            variant="caption"
            color="destructive"
            style={{ paddingHorizontal: wo.pad, marginTop: wo.rowGap }}
          >
            {errorMessage}
          </Text>
        ) : null}
      </View>
    ),
    [errorMessage, filter, filterCounts, meta],
  );

  const listEmpty = useMemo(
    () => (
      <View style={{ paddingHorizontal: wo.pad, paddingTop: wo.sectionGap }}>
        {isBootstrapping && orders.length === 0 ? (
          <OrdersLoadingState />
        ) : (
          <EmptyState
            icon={ClipboardListIcon}
            title={orders.length === 0 ? 'No work orders yet' : 'Nothing here'}
            description={
              orders.length === 0
                ? 'Create the first job for this shift — tap + below.'
                : 'No orders match this filter or search.'
            }
            primaryAction={
              canCreate && orders.length === 0
                ? {
                    label: 'Create work order',
                    onPress: () => router.push('/(tabs)/orders/new'),
                  }
                : query || filter !== 'all'
                  ? {
                      label: 'Show all orders',
                      onPress: () => {
                        haptics.selection();
                        setQuery('');
                        setFilter('all');
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
      <ScreenGate
        variant="no-company"
        title="No workspace"
        description="Select a company in your profile to see work orders."
        primaryAction={{
          label: 'Open profile',
          onPress: () => router.navigate('/(tabs)/profile'),
        }}
      />
    );
  }

  if (!can('work_orders_view')) {
    return (
      <ScreenGate
        variant="no-permission"
        icon={ClipboardListIcon}
        title="No access"
        description="Your role does not have permission to view work orders."
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={screenOptions} />
      <FlashList
        data={rows}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        // Lets the native large title collapse and the bar blur on scroll.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: wo.sectionGap + (canCreate ? ordersFabScrollClearance() : 0),
        }}
        onScrollBeginDrag={Keyboard.dismiss}
        keyboardDismissMode="on-drag"
      />
      {canCreate ? (
        <OrdersCreateFab onPress={() => router.push('/(tabs)/orders/new')} />
      ) : null}
    </Screen>
  );
}
