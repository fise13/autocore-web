import { useMemo } from 'react';
import { View } from 'react-native';
import { Host, Menu, Button as SwiftButton } from '@expo/ui/swift-ui';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from '@/hooks';
import { haptics, tokens } from '@/theme';

import type { OrderFilterId } from '../types';

export type OrdersFilterMenuItem = {
  id: OrderFilterId;
  label: string;
  count: number;
  systemImage: SFSymbol;
};

type OrdersFilterMenuProps = {
  label: string;
  filters: OrdersFilterMenuItem[];
  activeFilter: OrderFilterId;
  onFilterChange: (id: OrderFilterId) => void;
  /** Android / lift fallback — unused on iOS. */
  onOpen?: () => void;
  filterLifted?: boolean;
  buttonRef?: unknown;
};

/**
 * Native SwiftUI `Menu` — system list of filter options (iOS).
 */
export function OrdersFilterMenu({
  label,
  filters,
  activeFilter,
  onFilterChange,
}: OrdersFilterMenuProps) {
  const { colors, isDark } = useTheme();

  const items = useMemo(
    () =>
      filters.map((entry) => {
        const selected = entry.id === activeFilter;
        return {
          ...entry,
          selected,
          systemImage: (selected ? 'checkmark' : entry.systemImage) as SFSymbol,
        };
      }),
    [activeFilter, filters],
  );

  return (
    <View
      style={{
        minHeight: tokens.control.hitTarget,
        minWidth: 88,
        justifyContent: 'center',
      }}
    >
      <Host
        matchContents
        colorScheme={isDark ? 'dark' : 'light'}
        seedColor={colors.primary}
        style={{ minHeight: tokens.control.hitTarget }}
      >
        <Menu label={label} systemImage="line.3.horizontal.decrease">
          {items.map((item) => (
            <SwiftButton
              key={item.id}
              label={`${item.label}  ${item.count}`}
              systemImage={item.systemImage}
              onPress={() => {
                onFilterChange(item.id);
                haptics.selection();
              }}
            />
          ))}
        </Menu>
      </Host>
    </View>
  );
}
