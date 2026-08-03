import type { Ref } from 'react';
import { Pressable, View } from 'react-native';

import { PlusIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, tokens } from '@/theme';

import {
  OrdersFilterMenu,
  type OrdersFilterMenuItem,
} from './orders-filter-menu';
import type { OrderFilterId } from '../types';

const ACTION_SIZE = tokens.control.hitTarget;

type OrdersToolbarProps = {
  editing: boolean;
  canCreate: boolean;
  filterLabel: string;
  filters: OrdersFilterMenuItem[];
  activeFilter: OrderFilterId;
  onFilterChange: (id: OrderFilterId) => void;
  filterButtonRef?: Ref<View>;
  filterLifted?: boolean;
  onExitEdit: () => void;
  onOpenFilter: () => void;
  onCreate: () => void;
};

/**
 * Work-orders toolbar — Filter (native menu on iOS) + New; Done while multi-select.
 */
export function OrdersToolbar({
  editing,
  canCreate,
  filterLabel,
  filters,
  activeFilter,
  onFilterChange,
  filterButtonRef,
  filterLifted = false,
  onExitEdit,
  onOpenFilter,
  onCreate,
}: OrdersToolbarProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.inline }}>
      {editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done editing"
          hitSlop={4}
          onPress={() => {
            haptics.selection();
            onExitEdit();
          }}
          style={{
            minHeight: ACTION_SIZE,
            paddingHorizontal: tokens.space.stack,
            borderRadius: tokens.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <Text
            variant="headline"
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: colors.primaryForeground,
            }}
          >
            Done
          </Text>
        </Pressable>
      ) : null}

      {!editing ? (
        <OrdersFilterMenu
          label={filterLabel}
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          onOpen={onOpenFilter}
          filterLifted={filterLifted}
          buttonRef={filterButtonRef}
        />
      ) : null}

      {canCreate && !editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New work order"
          hitSlop={4}
          onPress={() => {
            haptics.light();
            onCreate();
          }}
          style={{
            minHeight: ACTION_SIZE,
            paddingHorizontal: tokens.space.stack + 2,
            borderRadius: tokens.radius.full,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space.micro + 2,
            backgroundColor: colors.primary,
          }}
        >
          <PlusIcon size={18} color={colors.primaryForeground} strokeWidth={2.4} />
          <Text
            variant="headline"
            style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}
          >
            New
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export type { OrdersFilterMenuItem };
