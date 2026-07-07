import { memo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { View as RNView } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { UserRoundIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { usePressAnimation } from '@/animations';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
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
      <Text variant="meta" style={{ color: '#fff', fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const ANIMATE_FIRST = 8;

export const OrderCard = memo(function OrderCard({
  order,
  index,
  onMarkReady,
  onCall,
}: OrderCardProps) {
  const { colors } = useTheme();
  const { openOrder } = useOrderTransition();
  const cardRef = useRef<RNView>(null);
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  const animate = index < ANIMATE_FIRST;
  const enterStyle = useOrdersEnter({
    delay: animate ? ordersTimeline.listBase + index * ordersTimeline.listStagger : 0,
    translateY: animate ? 12 : 0,
    enabled: animate,
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
          paddingHorizontal: rhythm.cardPadX,
          paddingVertical: rhythm.cardPadY,
          gap: rhythm.inline,
        }}
      >
        <View ref={cardRef} collapsable={false} style={{ gap: rhythm.inline }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: rhythm.inline,
            }}
          >
            <View style={{ flex: 1, gap: rhythm.micro / 2 }}>
              <Text variant="bodyStrong">{formatWorkOrderLabel(order.number)}</Text>
              <Text variant="caption" color="muted">
                {order.customer}
              </Text>
              {order.assignee ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: rhythm.micro,
                    marginTop: rhythm.micro / 2,
                  }}
                >
                  <UserRoundIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
                  <Text variant="meta" color="muted">
                    {order.assignee}
                  </Text>
                </View>
              ) : null}
            </View>
            <OrderStatusBadge status={order.status} />
            {order.isUnassigned ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: toneBackground(colors.warning, 0.14),
                }}
              >
                <Text variant="meta" style={{ color: colors.warning, fontWeight: '600', fontSize: 10 }}>
                  Свободный
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: rhythm.inline,
            }}
          >
            <Text variant="caption" color="muted" style={{ flex: 1 }} numberOfLines={1}>
              {formatOrderVehicleLine(order)}
            </Text>
            <Text variant="small" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
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
        renderRightActions={(_progress, drag) => {
          const canReady = order.status !== 'completed' && order.status !== 'ready';
          const canCall = Boolean(order.phone);
          if (!canReady && !canCall) return null;

          return (
            <View style={{ flexDirection: 'row' }}>
              {canReady ? (
                <SwipeAction
                  label="Готов"
                  color={colors.success}
                  drag={drag}
                  onPress={() => {
                    haptics.medium();
                    onMarkReady(order);
                  }}
                />
              ) : null}
              {canCall ? (
                <SwipeAction
                  label="Звонок"
                  color={colors.warning}
                  drag={drag}
                  onPress={() => {
                    haptics.light();
                    onCall(order);
                  }}
                />
              ) : null}
            </View>
          );
        }}
      >
        {card}
      </ReanimatedSwipeable>
    </Animated.View>
  );
});
