import type { Ref } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm, tokens } from '@/theme';

import {
  OrdersToolbar,
  type OrdersFilterMenuItem,
} from './orders-toolbar';
import type { OrderFilterId } from '../types';

type OrdersHeaderProps = {
  metaLine: string;
  query: string;
  onQueryChange: (value: string) => void;
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
 * Work-orders hub chrome — Finances-style custom header.
 */
export function OrdersHeader({
  metaLine,
  query,
  onQueryChange,
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
}: OrdersHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + rhythm.headerTop,
        paddingBottom: rhythm.tight,
        paddingHorizontal: tokens.space.screenX,
        gap: tokens.space.stack,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: tokens.space.stack,
        }}
      >
        <View style={{ flex: 1, gap: tokens.space.micro, minWidth: 0 }}>
          <Text
            variant="largeTitle"
            style={{
              fontSize: 34,
              lineHeight: 40,
              fontWeight: '700',
              letterSpacing: -0.6,
            }}
          >
            Work orders
          </Text>
          {metaLine ? (
            <Text variant="subheadline" color="muted" numberOfLines={1}>
              {metaLine}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space.inline,
            paddingTop: tokens.space.micro,
          }}
        >
          <OrdersToolbar
            editing={editing}
            canCreate={canCreate}
            filterLabel={filterLabel}
            filters={filters}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            filterButtonRef={filterButtonRef}
            filterLifted={filterLifted}
            onExitEdit={onExitEdit}
            onOpenFilter={onOpenFilter}
            onCreate={onCreate}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: tokens.control.heightLg,
          borderRadius: tokens.radius.group,
          backgroundColor: colors.secondary,
          paddingHorizontal: tokens.space.stack,
          gap: tokens.space.inline,
        }}
      >
        <SearchIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Customer, WO #, vehicle"
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 20,
            fontWeight: '500',
            color: colors.foreground,
            paddingVertical: 10,
          }}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            onPress={() => onQueryChange('')}
          >
            <Text variant="footnote" style={{ color: colors.primary, fontWeight: '600' }}>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
