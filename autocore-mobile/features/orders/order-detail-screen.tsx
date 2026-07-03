import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  PhoneIcon,
  ReceiptIcon,
  TagIcon,
} from '@/assets/icons';
import { Button, IconButton, Text } from '@/components/ui';
import { ScreenActionFooter } from '@/components/navigation/screen-action-footer';
import { useTheme, useSession, useWorkOrdersRealtime, useFloatingTabBarInset } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { formatPrice } from '@/features/search/lib/format';
import { nextStatuses, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import { transitionWorkOrder } from '@/services/api/work-orders';
import type { WorkOrderStatus } from '@/types/work-order';

import {
  useOrderDetailContentEnter,
  useOrderDetailHeroEnter,
} from './animation/use-order-detail-enter';
import { OrderStatusBadge } from './components/order-status-badge';
import { OrderDocumentsSection } from './components/order-documents-section';
import { OrderWorkflowProgress } from './components/order-workflow-progress';
import { orderStatusLabel } from './lib/status';
import { formatOrderVehicleLine, formatWorkOrderLabel } from './lib/order-display';
import { ordersLayout } from './layout';

type OrderDetailScreenProps = {
  orderId: string;
};

type ActionItem = {
  id: string;
  label: string;
  icon: typeof CheckCircle2Icon;
  tone?: 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
  onPress: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: '45%', gap: 4 }}>
      <Text variant="caption" color="muted" style={{ fontSize: 10, fontWeight: '500', letterSpacing: 0.2 }}>
        {label}
      </Text>
      <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.15 }}>
        {value}
      </Text>
    </View>
  );
}

export function OrderDetailScreen({ orderId }: OrderDetailScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useFloatingTabBarInset();
  const router = useRouter();
  const { companyId, can } = useSession();
  const { orders, domainOrders } = useWorkOrdersRealtime(companyId);
  const order = orders.find((entry) => entry.id === orderId);
  const domainOrder = domainOrders.find((entry) => entry.id === orderId);
  const [transitioning, setTransitioning] = useState(false);

  const heroStyle = useOrderDetailHeroEnter(40);
  const contentStyle = useOrderDetailContentEnter(140);

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="body" color="muted">
          Наряд не найден
        </Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Назад
        </Button>
      </View>
    );
  }

  const setDomainStatus = async (status: WorkOrderStatus) => {
    if (!can('work_orders_edit')) return;
    setTransitioning(true);
    haptics.light();
    try {
      await transitionWorkOrder(orderId, status);
    } catch {
      haptics.warning();
    } finally {
      setTransitioning(false);
    }
  };

  const availableTransitions = domainOrder ? nextStatuses(domainOrder.status) : [];

  const actions: ActionItem[] = availableTransitions.slice(0, 4).map((status) => ({
    id: status,
    label: STATUS_LABELS[status],
    icon: status === 'completed' || status === 'delivered' ? CheckCircle2Icon : ClockIcon,
    tone:
      status === 'completed' || status === 'delivered'
        ? 'success'
        : status === 'waiting_parts'
          ? 'warning'
          : 'primary',
    onPress: () => void setDomainStatus(status),
  }));

  actions.push(
    {
      id: 'call',
      label: 'Позвонить',
      icon: PhoneIcon,
      tone: 'primary',
      onPress: () => haptics.selection(),
    },
    {
      id: 'payment',
      label: 'Оплата',
      icon: ReceiptIcon,
      tone: 'muted',
      onPress: () => haptics.selection(),
    },
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: ordersLayout.pad,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <IconButton accessibilityLabel="Назад" variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
            {formatWorkOrderLabel(order.number)}
          </Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: ordersLayout.pad,
          paddingBottom: scrollBottom,
          gap: ordersLayout.section,
        }}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <Animated.View
          style={[
            {
              borderWidth: ordersLayout.hairline,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 20,
              gap: 16,
              overflow: 'hidden',
            },
            heroStyle,
          ]}
        >
          <View style={{ gap: 6 }}>
            <Text variant="heading" style={{ fontSize: 28, fontWeight: '700', letterSpacing: -0.6, lineHeight: 32 }}>
              {order.vehicle}
            </Text>
            <Text variant="body" color="muted" style={{ fontSize: 16, fontWeight: '500' }}>
              {order.engine}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {order.customer}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <OrderStatusBadge status={order.status} size="md" />
            <Text variant="body" style={{ fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.3 }}>
              {formatPrice(order.price)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
              Срок: {order.estimated}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
              {orderStatusLabel[order.status]}
            </Text>
          </View>

          <OrderWorkflowProgress status={order.status} />
        </Animated.View>

        <Animated.View style={[{ gap: ordersLayout.section }, contentStyle]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <DetailRow label="Клиент" value={order.customer} />
            <DetailRow label="Авто" value={formatOrderVehicleLine(order)} />
            <DetailRow label="Двигатель" value={order.engine} />
            <DetailRow label="Срок" value={order.estimated} />
            {order.vin ? <DetailRow label="VIN" value={order.vin} /> : null}
          </View>

          <View style={{ gap: 12 }}>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
              Действия
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {actions.map((action) => {
                const Icon = action.icon;
                const tint =
                  action.tone === 'success'
                    ? colors.success
                    : action.tone === 'warning'
                      ? colors.warning
                      : action.tone === 'destructive'
                        ? colors.destructive
                        : action.tone === 'muted'
                          ? colors.mutedForeground
                          : colors.primary;

                return (
                  <Pressable
                    key={action.id}
                    accessibilityRole="button"
                    onPress={action.onPress}
                    style={{
                      width: '47%',
                      minHeight: 58,
                      borderRadius: ordersLayout.radius,
                      borderWidth: ordersLayout.hairline,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: toneBackground(tint, 0.1),
                      }}
                    >
                      <Icon size="sm" color={tint} strokeWidth={1.85} />
                    </View>
                    <Text variant="caption" style={{ fontSize: 12, fontWeight: '600', flex: 1 }}>
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {domainOrder && can('work_orders_view') ? (
            <OrderDocumentsSection order={domainOrder} colors={colors} />
          ) : null}

          <View style={{ gap: 12 }}>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
              Таймлайн
            </Text>
            {order.timeline.map((event, index) => {
              const isLast = index === order.timeline.length - 1;
              const Icon = event.done ? CheckCircle2Icon : ClockIcon;
              const tint = event.done ? colors.primary : colors.mutedForeground;

              return (
                <View key={event.id} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', width: 22 }}>
                    <Icon size="sm" color={tint} strokeWidth={1.85} />
                    {!isLast ? (
                      <View style={{ width: 1, flex: 1, minHeight: 18, backgroundColor: colors.border, marginVertical: 4 }} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: isLast ? 0 : 10 }}>
                    <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
                      {event.title}
                    </Text>
                    <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                      {event.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {order.partsNote ? (
            <View style={{ gap: 4 }}>
              <Text variant="caption" color="muted">
                Запчасти
              </Text>
              <Text variant="body" style={{ fontSize: 14 }}>
                {order.partsNote}
              </Text>
            </View>
          ) : null}
          {order.paymentNote ? (
            <View style={{ gap: 4 }}>
              <Text variant="caption" color="muted">
                Оплата
              </Text>
              <Text variant="body" style={{ fontSize: 14 }}>
                {order.paymentNote}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <ScreenActionFooter horizontalPadding={ordersLayout.pad} absolute>
        <Button
          disabled={transitioning || availableTransitions.length === 0 || !can('work_orders_edit')}
          loading={transitioning}
          onPress={() => {
            const next = availableTransitions[0];
            if (next) void setDomainStatus(next);
          }}
          style={{ flex: 1 }}
        >
          Обновить статус
        </Button>
      </ScreenActionFooter>
    </View>
  );
}
