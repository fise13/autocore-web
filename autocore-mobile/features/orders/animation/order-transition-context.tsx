import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { formatPrice } from '@/features/search/lib/format';

import { OrderStatusBadge } from '../components/order-status-badge';
import { OrderWorkflowProgress } from '../components/order-workflow-progress';
import { ordersLayout } from '../layout';
import type { WorkOrder } from '../types';

type SourceLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OrderTransitionContextValue = {
  openOrder: (order: WorkOrder, layout: SourceLayout) => void;
  activeOrderId: string | null;
};

const OrderTransitionContext = createContext<OrderTransitionContextValue | null>(null);

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type OverlayProps = {
  order: WorkOrder;
  source: SourceLayout;
  onDone: () => void;
};

function OrderOpenOverlay({ order, source, onDone }: OverlayProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  const finish = useCallback(() => {
    onDone();
  }, [onDone]);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) {
        runOnJS(finish)();
      }
    });
  }, [finish, progress]);

  const shellStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      position: 'absolute',
      left: source.x + (0 - source.x) * p,
      top: source.y + (insets.top - source.y) * p,
      width: source.width + (SCREEN_W - source.width) * p,
      height: source.height + (SCREEN_H - source.height) * p,
      borderRadius: ordersLayout.cardRadius + (0 - ordersLayout.cardRadius) * p,
      backgroundColor: colors.background,
      overflow: 'hidden',
      opacity: 1 - p * 0.15,
    };
  });

  const contentOpacity = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="none">
      <Animated.View style={shellStyle}>
        <Animated.View style={[{ flex: 1, padding: 18, gap: 12 }, contentOpacity]}>
          <View style={{ gap: 4 }}>
            <Text variant="heading" style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
              {order.vehicle}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
              {order.engine}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <OrderStatusBadge status={order.status} />
            <Text variant="body" style={{ fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {formatPrice(order.price)}
            </Text>
          </View>
          <OrderWorkflowProgress status={order.status} compact />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function OrderTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [overlay, setOverlay] = useState<{ order: WorkOrder; source: SourceLayout } | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const openOrder = useCallback(
    (order: WorkOrder, source: SourceLayout) => {
      setActiveOrderId(order.id);
      setOverlay({ order, source });
      router.push(`/(tabs)/orders/${order.id}`);
    },
    [router],
  );

  const value = useMemo(
    () => ({
      openOrder,
      activeOrderId,
    }),
    [activeOrderId, openOrder],
  );

  return (
    <OrderTransitionContext.Provider value={value}>
      {children}
      {overlay ? (
        <OrderOpenOverlay
          order={overlay.order}
          source={overlay.source}
          onDone={() => setOverlay(null)}
        />
      ) : null}
    </OrderTransitionContext.Provider>
  );
}

export function useOrderTransition() {
  const ctx = useContext(OrderTransitionContext);
  if (!ctx) {
    throw new Error('useOrderTransition must be used within OrderTransitionProvider');
  }
  return ctx;
}
