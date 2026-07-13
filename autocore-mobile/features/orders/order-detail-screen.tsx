import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  ClockIcon,
  PhoneIcon,
  ReceiptIcon,
  TagIcon,
} from '@/assets/icons';
import { Button, IconButton, Text, toast } from '@/components/ui';
import {
  useTheme,
  useSession,
  useEmployeesRealtime,
  useWorkOrdersRealtime,
  useFloatingTabBarInset,
  useInventoryCatalog,
} from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { canMechanicClaimWorkOrder, evaluateClaimEligibility, countOpenAssignedWorkOrders, DEFAULT_MAX_ACTIVE_WORK_ORDERS } from '@autocore/rbac';
import { resolveInventoryShelf } from '@/lib/inventory/resolve-shelf';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { formatPrice } from '@/features/search/lib/format';
import { laborLineLabel } from '@/lib/work-order/composer-utils';
import { laborLineTotal } from '@/lib/work-order/labor-pricing';
import { nextStatuses, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import { transitionWorkOrder, claimWorkOrder } from '@/services/api/work-orders';
import type { WorkOrderStatus } from '@/types/work-order';
import { openPhone } from '@/utils/open-phone';

import {
  useOrderDetailContentEnter,
  useOrderDetailHeroEnter,
} from './animation/use-order-detail-enter';
import { OrderClaimSection } from './components/order-claim-section';
import { OrderStatusBadge } from './components/order-status-badge';
import { OrderDocumentsSection } from './components/order-documents-section';
import { OrderLinesList } from './components/order-lines-list';
import { OrderWorkflowProgress } from './components/order-workflow-progress';
import { navigateOrderEdit } from './lib/order-composition-nav';
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
    <View style={{ flex: 1, minWidth: '45%', gap: rhythm.micro }}>
      <Text variant="meta" color="muted" style={{ fontWeight: '500' }}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ fontSize: rhythm.valueStrong }}>
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
  const { companyId, can, uid, profile } = useSession();
  const { items: inventoryItems } = useInventoryCatalog(companyId);
  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );
  const rbac = useRbacPolicy();
  const { orders, domainOrders } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
  });
  const { employees } = useEmployeesRealtime(companyId);
  const order = orders.find((entry) => entry.id === orderId);
  const domainOrder = domainOrders.find((entry) => entry.id === orderId);
  const [transitioning, setTransitioning] = useState(false);
  const [claiming, setClaiming] = useState(false);

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
    if (!can('work_orders_edit')) {
      toast({ title: 'Нет прав на изменение наряда', variant: 'warning' });
      return;
    }
    setTransitioning(true);
    haptics.light();
    try {
      await transitionWorkOrder(orderId, status);
      haptics.success();
      toast({
        title: STATUS_LABELS[status],
        description: `Наряд ${formatWorkOrderLabel(order.number)} обновлён`,
        variant: 'success',
      });
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Не удалось обновить статус',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setTransitioning(false);
    }
  };

  const availableTransitions = domainOrder ? nextStatuses(domainOrder.status) : [];
  const canClaimBase =
    Boolean(domainOrder && uid) && canMechanicClaimWorkOrder(domainOrder!, uid!);
  const claimEligibility = useMemo(() => {
    if (!domainOrder || !uid || !profile) return null;
    const openAssignedCount = countOpenAssignedWorkOrders(domainOrders, uid);
    const selfEmployee = employees.find((entry) => entry.uid === uid);
    return evaluateClaimEligibility({
      order: domainOrder,
      uid,
      role: profile.role,
      shiftOn: selfEmployee?.shiftOn !== false,
      openAssignedCount,
      maxActive: DEFAULT_MAX_ACTIVE_WORK_ORDERS,
    });
  }, [domainOrder, domainOrders, employees, profile, uid]);
  const canClaim = canClaimBase && claimEligibility?.ok === true;
  const claimBlockedReason = canClaimBase && claimEligibility && !claimEligibility.ok ? claimEligibility.reason : undefined;
  const unassignedLaborCount =
    domainOrder?.laborLines.filter((line) => !line.assigneeIds.length).length ?? 0;

  const handleClaim = async () => {
    if (!canClaim) return;
    setClaiming(true);
    haptics.medium();
    try {
      await claimWorkOrder(orderId);
      haptics.success();
      toast({
        title: 'Наряд взят в работу',
        description: `№${order.number} теперь у вас`,
        variant: 'success',
      });
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Не удалось взять наряд',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  };

  const canEditOrder =
    Boolean(domainOrder) &&
    (domainOrder?.status === 'draft' || domainOrder?.status === 'confirmed') &&
    can('work_orders_edit');

  const laborLines = domainOrder?.laborLines.map((line) => ({
    id: line.id,
    label: laborLineLabel(line, employees),
    price: laborLineTotal(line),
  })) ?? [];
  const partLines = domainOrder?.partLines
    .filter((line) => line.source !== 'specific_quick')
    .map((line) => {
      const item = line.itemId ? inventoryById.get(line.itemId) : undefined;
      const shelf = item ? resolveInventoryShelf(item) : undefined;
      const detailParts = [line.sku, shelf ? `Место ${shelf}` : null].filter(Boolean);
      return {
        id: line.id,
        label: line.name,
        detail: detailParts.length ? detailParts.join(' · ') : undefined,
        price: line.quantity * line.unitPrice,
      };
    }) ?? [];
  const catalogLines = domainOrder?.partLines
    .filter((line) => line.source === 'specific_quick')
    .map((line) => ({
      id: line.id,
      label: line.specificCategoryName ? `${line.specificCategoryName} · ${line.name}` : line.name,
      price: line.quantity * line.unitPrice,
    })) ?? [];
  const motorLines = domainOrder?.motorLines.map((line) => ({
    id: line.id,
    label: [line.brandName, line.engineCode, line.serialCode].filter(Boolean).join(' ') || line.serialCode,
    detail: line.outcome === 'sell' ? 'Продажа' : 'Установка',
    price: line.unitPrice,
  })) ?? [];

  const actions: ActionItem[] = availableTransitions.slice(0, 3).map((status) => ({
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

  if (canEditOrder) {
    actions.unshift({
      id: 'edit',
      label: 'Редактировать',
      icon: ClipboardListIcon,
      tone: 'primary',
      onPress: () => {
        haptics.selection();
        navigateOrderEdit(router, orderId);
      },
    });
  }

  if (order.phone) {
    actions.push({
      id: 'call',
      label: 'Позвонить',
      icon: PhoneIcon,
      tone: 'primary',
      onPress: () => {
        haptics.selection();
        void openPhone(order.phone);
      },
    });
  }

  actions.push({
    id: 'payment',
    label: 'Оплата',
    icon: ReceiptIcon,
    tone: 'muted',
    onPress: () => {
      haptics.selection();
      router.navigate('/(tabs)/accounting');
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + rhythm.headerTop,
          paddingHorizontal: ordersLayout.pad,
          paddingBottom: rhythm.inline,
          flexDirection: 'row',
          alignItems: 'center',
          gap: rhythm.inline,
        }}
      >
        <IconButton accessibilityLabel="Назад" variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
        <View style={{ flex: 1 }}>
          <Text variant="meta" color="muted">
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
              borderRadius: ordersLayout.cardRadius,
              padding: rhythm.pad,
              gap: rhythm.stack,
              overflow: 'hidden',
            },
            heroStyle,
          ]}
        >
          <View style={{ gap: rhythm.tight }}>
            <Text variant="pageTitle">
              {order.vehicle}
            </Text>
            <Text variant="bodyLarge" color="muted" style={{ fontWeight: '500' }}>
              {order.engine}
            </Text>
            <Text variant="pageSubtitle" color="muted" style={{ marginTop: rhythm.micro / 2 }}>
              {order.customer}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <OrderStatusBadge status={order.status} size="md" />
            <Text variant="title" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {formatPrice(order.price)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="meta" color="muted">
              Срок: {order.estimated}
            </Text>
            <Text variant="meta" color="muted">
              {orderStatusLabel[order.status]}
            </Text>
          </View>

          <OrderWorkflowProgress status={order.status} />
        </Animated.View>

        {canClaimBase ? (
          <Animated.View style={contentStyle}>
            <OrderClaimSection
              orderNumber={order.number}
              unassignedCount={unassignedLaborCount}
              claiming={claiming}
              blockedReason={claimBlockedReason}
              onClaim={() => void handleClaim()}
            />
          </Animated.View>
        ) : null}

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
              Состав наряда
            </Text>
            <OrderLinesList
              laborLines={laborLines}
              partLines={partLines}
              catalogLines={catalogLines}
              motorLines={motorLines}
            />
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

                const isStatusAction = availableTransitions.some((status) => status === action.id);
                const disabled = transitioning && isStatusAction;

                return (
                  <Pressable
                    key={action.id}
                    accessibilityRole="button"
                    disabled={disabled}
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
                      opacity: disabled ? 0.55 : 1,
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
    </View>
  );
}
