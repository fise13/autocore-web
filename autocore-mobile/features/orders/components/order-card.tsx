import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { View as RNView } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { UserRoundIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { usePressAnimation } from '@/animations';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { formatPrice } from '@/features/search/lib/format';

import { useOrderTransition } from '../animation/order-transition-context';
import { useOrdersEnter } from '../animation/use-orders-enter';
import { ordersTimeline } from '../animation/orders-timeline';
import { formatOrderVehicleLine, formatWorkOrderLabel } from '../lib/order-display';
import { OrderStatusBadge } from './order-status-badge';
import { ordersLayout } from '../layout';
import type { WorkOrder } from '../types';

type OrderCardProps = {
  order: WorkOrder;
  index: number;
  onMarkReady: (order: WorkOrder) => void;
  onCall: (order: WorkOrder) => void;
};

function SwipeAction({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  drag: SharedValue<number>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        width: 76,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
      }}
    >
      <Text variant="caption" style={{ color: '#fff', fontWeight: '600', fontSize: 11 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function OrderCard({ order, index, onMarkReady, onCall }: OrderCardProps) {
  const { colors } = useTheme();
  const { openOrder } = useOrderTransition();
  const cardRef = useRef<RNView>(null);
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  const enterStyle = useOrdersEnter({
    delay: ordersTimeline.listBase + index * ordersTimeline.listStagger,
    translateY: 12,
    duration: 280,
  });

  const handleOpen = () => {
    haptics.light();
    cardRef.current?.measureInWindow((x, y, width, height) => {
      openOrder(order, { x, y, width, height });
    });
  };

  const card = (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={handleOpen}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          borderRadius: ordersLayout.cardRadius,
          borderWidth: ordersLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 10,
        }}
      >
        <View ref={cardRef} collapsable={false} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="body" style={{ fontSize: 14, fontWeight: '600', letterSpacing: -0.15 }}>
                {formatWorkOrderLabel(order.number)}
              </Text>
              <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                {order.customer}
              </Text>
              {order.assignee ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <UserRoundIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
                  <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
                    {order.assignee}
                  </Text>
                </View>
              ) : null}
            </View>
            <OrderStatusBadge status={order.status} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text variant="caption" color="muted" style={{ fontSize: 12, flex: 1 }} numberOfLines={1}>
              {formatOrderVehicleLine(order)}
            </Text>
            <Text variant="body" style={{ fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {formatPrice(order.price)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <Animated.View style={enterStyle}>
      <ReanimatedSwipeable
        friction={2}
        overshootFriction={8}
        renderLeftActions={(_progress, drag) => (
          <SwipeAction label="Открыть" color={colors.primary} drag={drag} onPress={handleOpen} />
        )}
        renderRightActions={(_progress, drag) => (
          <View style={{ flexDirection: 'row' }}>
            <SwipeAction
              label="Готов"
              color={colors.success}
              drag={drag}
              onPress={() => {
                haptics.medium();
                onMarkReady(order);
              }}
            />
            <SwipeAction
              label="Звонок"
              color={colors.warning}
              drag={drag}
              onPress={() => {
                haptics.light();
                onCall(order);
              }}
            />
            <SwipeAction label="Ещё" color={colors.mutedForeground} drag={drag} onPress={handleOpen} />
          </View>
        )}
      >
        {card}
      </ReanimatedSwipeable>
    </Animated.View>
  );
}
