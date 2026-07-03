import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { useOrdersEnter } from '../animation/use-orders-enter';
import { ordersSpring, ordersTimeline } from '../animation/orders-timeline';
import { ordersLayout } from '../layout';
import type { OrderFilterId, OrderFilterOption } from '../types';

const SEGMENT_INSET = 3;

type OrdersFiltersProps = {
  filters: OrderFilterOption[];
  activeFilter: OrderFilterId;
  onFilterChange: (filter: OrderFilterId) => void;
};

export function OrdersFilters({ filters, activeFilter, onFilterChange }: OrdersFiltersProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const enterStyle = useOrdersEnter({ delay: ordersTimeline.filters, translateY: 6, duration: 280 });
  const [trackWidth, setTrackWidth] = useState(0);
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  const activeIndex = Math.max(
    filters.findIndex((filter) => filter.id === activeFilter),
    0,
  );

  useEffect(() => {
    if (!trackWidth || filters.length === 0) return;

    const innerWidth = trackWidth - SEGMENT_INSET * 2;
    const segmentWidth = innerWidth / filters.length;
    const nextX = SEGMENT_INSET + activeIndex * segmentWidth;

    if (reduced) {
      pillX.value = nextX;
      pillWidth.value = segmentWidth;
      return;
    }

    pillX.value = withSpring(nextX, ordersSpring.chip);
    pillWidth.value = withSpring(segmentWidth, ordersSpring.chip);
  }, [activeIndex, filters.length, pillWidth, pillX, reduced, trackWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  return (
    <Animated.View style={[{ paddingHorizontal: ordersLayout.pad }, enterStyle]}>
      <View
        onLayout={onTrackLayout}
        style={{
          flexDirection: 'row',
          borderRadius: 12,
          borderWidth: ordersLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          padding: SEGMENT_INSET,
          position: 'relative',
        }}
      >
        {trackWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: SEGMENT_INSET,
                bottom: SEGMENT_INSET,
                left: 0,
                borderRadius: 9,
                backgroundColor: colors.card,
              },
              pillStyle,
            ]}
          />
        ) : null}

        {filters.map((filter) => {
          const selected = activeFilter === filter.id;

          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.selection();
                onFilterChange(filter.id);
              }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, zIndex: 1 }}
            >
              <Text
                variant="caption"
                style={{
                  fontSize: 12,
                  fontWeight: selected ? '600' : '500',
                  color: selected ? colors.foreground : colors.mutedForeground,
                }}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
