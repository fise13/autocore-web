import { ScrollView, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { useOrdersEnter } from '../animation/use-orders-enter';
import { ordersTimeline } from '../animation/orders-timeline';
import { wo, woType } from '../theme/wo-visual';
import type { OrderFilterId, OrderFilterOption } from '../types';

type OrdersFiltersProps = {
  filters: OrderFilterOption[];
  activeFilter: OrderFilterId;
  onFilterChange: (filter: OrderFilterId) => void;
  /** Row count behind each chip — a chip with nothing behind it recedes. */
  counts?: Record<string, number>;
};

export function OrdersFilters({
  filters,
  activeFilter,
  onFilterChange,
  counts,
}: OrdersFiltersProps) {
  const { colors } = useTheme();
  const enterStyle = useOrdersEnter({ delay: ordersTimeline.filters, translateY: 4, duration: 240 });

  return (
    <Animated.View style={enterStyle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: wo.pad,
          gap: 8,
          alignItems: 'center',
        }}
      >
        {filters.map((filter) => {
          const selected = activeFilter === filter.id;
          const count = counts?.[filter.id];
          const empty = count === 0 && !selected;

          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={count === undefined ? filter.label : `${filter.label}, ${count}`}
              onPress={() => {
                haptics.selection();
                onFilterChange(filter.id);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: wo.chipHeight,
                paddingHorizontal: 14,
                borderRadius: wo.radiusPill,
                backgroundColor: selected ? colors.foreground : colors.card,
                borderWidth: wo.rule,
                borderColor: selected ? colors.foreground : colors.border,
                opacity: empty ? 0.45 : 1,
              }}
            >
              <Text
                variant="caption"
                style={{
                  ...woType.meta,
                  fontWeight: '600',
                  color: selected ? colors.background : colors.foreground,
                }}
              >
                {filter.label}
              </Text>
              {count !== undefined ? (
                <Text
                  variant="meta"
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    lineHeight: 14,
                    fontVariant: ['tabular-nums'],
                    color: selected ? withAlpha(colors.background, 0.65) : colors.mutedForeground,
                  }}
                >
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}
