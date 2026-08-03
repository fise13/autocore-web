import { useCallback, useMemo } from 'react';
import { Keyboard, View } from 'react-native';
import type { ListRenderItemInfo } from '@shopify/flash-list';

import { EmptyState, FlashList, Text } from '@/components/ui';
import { ClipboardListIcon } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import { OrderRow } from './order-row';
import { buildOrderRows, type OrdersRow } from '../lib/group-orders';
import type { WorkOrder } from '../types';
import type { OrdersMailListProps } from './orders-mail-list.types';

export type { OrdersMailListProps };

function OrdersGroupHeader({ label, count }: { label: string; count: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: tokens.space.screenX,
        paddingTop: tokens.space.section - 4,
        paddingBottom: tokens.space.inline + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
      }}
    >
      <Text
        variant="title3"
        style={{
          fontWeight: '700',
          letterSpacing: -0.35,
          color: colors.foreground,
        }}
      >
        {label}
      </Text>
      <Text
        variant="subheadline"
        style={{
          fontWeight: '600',
          color: colors.primary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {count}
      </Text>
    </View>
  );
}

/**
 * Work orders day-grouped list — FlashList + OrderRow islands.
 */
export function OrdersMailList({
  orders,
  editing,
  selectedIds,
  onSelectionChange,
  onComplete,
  onEnterEdit,
  canEdit = true,
  emptyTitle,
  emptyDescription,
  isEmpty,
  onCreateEmpty,
}: OrdersMailListProps) {
  const rows = useMemo(() => buildOrderRows(orders), [orders]);
  const stickyHeaderIndices = useMemo(
    () =>
      rows
        .map((row, index) => (row.kind === 'header' ? index : -1))
        .filter((index) => index >= 0),
    [rows],
  );

  const toggleSelect = useCallback(
    (order: WorkOrder) => {
      const next = new Set(selectedIds);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      onSelectionChange(next);
    },
    [onSelectionChange, selectedIds],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OrdersRow>) => {
      if (item.kind === 'header') {
        return <OrdersGroupHeader label={item.label} count={item.count} />;
      }
      return (
        <OrderRow
          order={item.order}
          position={item.position}
          onComplete={onComplete}
          onEnterEdit={onEnterEdit}
          editing={editing}
          selected={selectedIds.has(item.order.id)}
          onToggleSelect={toggleSelect}
          canEdit={canEdit}
        />
      );
    },
    [canEdit, editing, onComplete, onEnterEdit, selectedIds, toggleSelect],
  );

  if (isEmpty) {
    return (
      <View style={{ paddingHorizontal: tokens.space.screenX, paddingTop: tokens.space.section }}>
        <EmptyState
          icon={ClipboardListIcon}
          title={emptyTitle}
          description={emptyDescription}
          primaryAction={
            onCreateEmpty
              ? { label: 'Create work order', onPress: onCreateEmpty }
              : undefined
          }
        />
      </View>
    );
  }

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.kind}
      renderItem={renderItem}
      stickyHeaderIndices={stickyHeaderIndices}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: tokens.space.section + (editing && selectedIds.size > 0 ? 88 : 0),
      }}
      onScrollBeginDrag={Keyboard.dismiss}
      keyboardDismissMode="on-drag"
    />
  );
}
