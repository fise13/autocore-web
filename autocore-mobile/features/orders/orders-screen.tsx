import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import type { View as RNView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import type { SFSymbol } from 'sf-symbols-typescript';

import { ClipboardListIcon, FilterIcon } from '@/assets/icons';
import {
  Button,
  Screen,
  ScreenGate,
  StickyActionBar,
  Text,
  toast,
  type IosLiftMenuItem,
} from '@/components/ui';
import { useSession, useWorkOrdersRealtime, useModuleEnabled, useTheme } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import {
  filterMobileOrders,
  computeMobileOrdersMeta,
  computeMobileFilterCounts,
} from '@/lib/work-order/map-to-mobile-card';
import { transitionWorkOrder } from '@/services/api/work-orders';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';

import { orderFilters } from './data/mock-orders';
import { OrdersLoadingState } from './components/order-card-skeleton';
import { OrdersHeader } from './components/orders-header';
import { OrdersLiftProvider, useOrdersLift } from './components/orders-lift-provider';
import { OrdersMailList } from './components/orders-mail-list';
import {
  canMarkCompleted,
  explainCannotComplete,
  humanizeTransitionError,
} from './lib/transition-messages';
import type { OrderFilterId, WorkOrder } from './types';

const FILTER_IDS = orderFilters.map((filter) => filter.id);

function parseOrderFilter(value: string | string[] | undefined): OrderFilterId | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return FILTER_IDS.includes(raw as OrderFilterId) ? (raw as OrderFilterId) : null;
}

function parseMineOnly(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === '1';
}

function isOpenOrderStatus(status: WorkOrder['status']): boolean {
  return status !== 'completed' && status !== 'delivered' && status !== 'cancelled';
}

const FILTER_SF: Record<OrderFilterId, SFSymbol> = {
  open: 'circle',
  in_progress: 'wrench.and.screwdriver',
  waiting: 'clock',
  done: 'checkmark.seal',
  free: 'person',
  all: 'square.grid.2x2',
};

export function OrdersScreen() {
  return (
    <OrdersLiftProvider>
      <OrdersScreenBody />
    </OrdersLiftProvider>
  );
}

function OrdersScreenBody() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[]; mine?: string | string[] }>();
  const { colors } = useTheme();
  const { openLift, filterLifted } = useOrdersLift();
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
  const [filter, setFilter] = useState<OrderFilterId>(
    () => parseOrderFilter(params.filter) ?? 'open',
  );
  const mineOnly = parseMineOnly(params.mine);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const filterButtonRef = useRef<RNView>(null);

  useEffect(() => {
    const next = parseOrderFilter(params.filter);
    if (next) setFilter(next);
  }, [params.filter]);

  const meta = useMemo(() => computeMobileOrdersMeta(orders), [orders]);
  const filterCounts = useMemo(() => computeMobileFilterCounts(orders, FILTER_IDS), [orders]);

  const filteredOrders = useMemo(() => {
    let list = filterMobileOrders(orders, filter, query);
    if (mineOnly) {
      list = list.filter((order) => order.isAssignedToMe && isOpenOrderStatus(order.status));
    }
    return list;
  }, [filter, mineOnly, orders, query]);

  const activeFilterLabel =
    orderFilters.find((entry) => entry.id === filter)?.label ?? 'Active';

  const filterMenuItems = useMemo(
    () =>
      orderFilters.map((entry) => ({
        id: entry.id,
        label: entry.label,
        count: filterCounts[entry.id] ?? 0,
        systemImage: FILTER_SF[entry.id],
      })),
    [filterCounts],
  );

  const exitEditing = useCallback(() => {
    setEditing(false);
    setSelectedIds(new Set());
  }, []);

  const openFilterMenu = useCallback(() => {
    filterButtonRef.current?.measureInWindow((x, y, width, height) => {
      haptics.medium();
      const items: IosLiftMenuItem[] = orderFilters.map((entry) => {
        const count = filterCounts[entry.id] ?? 0;
        const selected = entry.id === filter;
        return {
          label: `${entry.label}  ${count}`,
          systemImage: selected ? 'checkmark' : FILTER_SF[entry.id],
          selected,
          onPress: () => {
            setFilter(entry.id);
            haptics.selection();
          },
        };
      });
      openLift({
        filter: true,
        anchor: { x, y, width, height },
        menuPlacement: 'below',
        items,
        previewStyle: {
          borderRadius: tokens.radius.full,
          backgroundColor: colors.secondary,
        },
        preview: (
          <View
            style={{
              minHeight: tokens.control.hitTarget,
              paddingHorizontal: tokens.space.stack,
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space.micro + 2,
            }}
          >
            <FilterIcon size={18} color={colors.foreground} strokeWidth={1.85} />
            <Text
              variant="headline"
              style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}
            >
              {orderFilters.find((entry) => entry.id === filter)?.label ?? 'Active'}
            </Text>
          </View>
        ),
      });
    });
  }, [colors.foreground, colors.secondary, filter, filterCounts, openLift]);

  const markComplete = useCallback(
    async (order: WorkOrder) => {
      if (!canEdit) {
        toast({ title: 'You do not have permission to edit this work order', variant: 'warning' });
        return;
      }
      if (!canMarkCompleted(order.status)) {
        const copy = explainCannotComplete(order.status);
        haptics.warning();
        toast({ title: copy.title, description: copy.description, variant: 'warning' });
        return;
      }
      try {
        haptics.medium();
        await transitionWorkOrder(order.id, 'completed');
        haptics.success();
        toast({ title: 'Work order completed', variant: 'success' });
      } catch (error) {
        haptics.warning();
        const copy = humanizeTransitionError(
          error instanceof Error ? error.message : 'Failed to update status',
          order.status,
          'completed',
        );
        toast({ title: copy.title, description: copy.description, variant: 'destructive' });
      }
    },
    [canEdit],
  );

  const bulkComplete = useCallback(async () => {
    if (!canEdit || selectedIds.size === 0) return;
    const selected = filteredOrders.filter((order) => selectedIds.has(order.id));
    const targets = selected.filter((order) => canMarkCompleted(order.status));
    const blocked = selected.filter((order) => !canMarkCompleted(order.status));

    if (targets.length === 0) {
      const sample = blocked[0];
      const copy = sample
        ? explainCannotComplete(sample.status)
        : { title: 'Nothing to complete', description: 'Select orders that are ready to complete.' };
      toast({ title: copy.title, description: copy.description, variant: 'warning' });
      return;
    }
    try {
      haptics.medium();
      await Promise.all(targets.map((order) => transitionWorkOrder(order.id, 'completed')));
      haptics.success();
      const skipped = blocked.length;
      toast({
        title: targets.length === 1 ? 'Work order completed' : `${targets.length} completed`,
        description: skipped > 0 ? `${skipped} skipped — not ready to complete yet` : undefined,
        variant: 'success',
      });
      exitEditing();
    } catch (error) {
      haptics.warning();
      const copy = humanizeTransitionError(
        error instanceof Error ? error.message : 'Failed to update status',
      );
      toast({ title: copy.title, description: copy.description, variant: 'destructive' });
    }
  }, [canEdit, exitEditing, filteredOrders, selectedIds]);

  const enterEdit = useCallback((order: WorkOrder) => {
    setEditing(true);
    setSelectedIds(new Set([order.id]));
  }, []);

  const metaLine = [
    `${meta.openCount} open`,
    filter !== 'open' ? activeFilterLabel : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const isListEmpty = filteredOrders.length === 0;
  const emptyTitle = orders.length === 0 ? 'No work orders yet' : 'Nothing here';
  const emptyDescription =
    orders.length === 0
      ? 'Create the first job for this shift — tap New in the toolbar.'
      : 'No orders match this filter or search.';

  if (!profile?.companyId || !enabled) {
    return (
      <Screen>
        <OrdersLoadingState />
      </Screen>
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
      <Stack.Screen options={{ headerShown: false }} />

      <OrdersHeader
        metaLine={metaLine}
        query={query}
        onQueryChange={setQuery}
        editing={editing}
        canCreate={canCreate}
        filterLabel={activeFilterLabel}
        filters={filterMenuItems}
        activeFilter={filter}
        onFilterChange={setFilter}
        filterButtonRef={filterButtonRef}
        filterLifted={filterLifted}
        onExitEdit={exitEditing}
        onOpenFilter={openFilterMenu}
        onBack={() => goBackOrReplace(router, '/(tabs)' as Href)}
        onCreate={() => router.push('/orders/new')}
      />

      {errorMessage ? (
        <Text
          variant="caption"
          color="destructive"
          style={{ paddingHorizontal: tokens.space.screenX, paddingTop: tokens.space.inline }}
        >
          {errorMessage}
        </Text>
      ) : null}

      {isBootstrapping && orders.length === 0 ? (
        <View style={{ paddingHorizontal: tokens.space.screenX, paddingTop: tokens.space.section }}>
          <OrdersLoadingState />
        </View>
      ) : (
        <OrdersMailList
          orders={filteredOrders}
          editing={editing}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onComplete={markComplete}
          onEnterEdit={enterEdit}
          canEdit={canEdit}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          isEmpty={isListEmpty}
          onCreateEmpty={
            canCreate && orders.length === 0
              ? () => router.push('/orders/new')
              : undefined
          }
        />
      )}

      {editing && selectedIds.size > 0 ? (
        <StickyActionBar>
          <Button native={false} onPress={() => void bulkComplete()}>
            Mark completed ({selectedIds.size})
          </Button>
        </StickyActionBar>
      ) : null}
    </Screen>
  );
}
