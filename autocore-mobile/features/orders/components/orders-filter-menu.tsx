import type { Ref } from 'react';
import { Pressable, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { FilterIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme';

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
  onOpen?: () => void;
  filterLifted?: boolean;
  buttonRef?: Ref<View>;
};

/**
 * Android / default — opens the screen-level lift menu via `onOpen`.
 */
export function OrdersFilterMenu({
  label,
  onOpen,
  filterLifted = false,
  buttonRef,
}: OrdersFilterMenuProps) {
  const { colors } = useTheme();

  return (
    <View ref={buttonRef} collapsable={false} style={{ opacity: filterLifted ? 0 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${label}`}
        hitSlop={6}
        onPress={onOpen}
        style={{
          minHeight: tokens.control.hitTarget,
          paddingHorizontal: tokens.space.stack,
          borderRadius: tokens.radius.full,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space.micro + 2,
          backgroundColor: colors.secondary,
        }}
      >
        <FilterIcon size={18} color={colors.foreground} strokeWidth={1.85} />
        <Text
          variant="headline"
          style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
