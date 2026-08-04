import { Stack, useRouter } from 'expo-router';
import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import {
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  EllipsisIcon,
  PackageIcon,
  PhoneIcon,
  WrenchIcon,
} from '@/assets/icons';
import type { IconProps } from '@/assets/icons/create-icon';
import { Button, Text, toast } from '@/components/ui';
import { ScreenActionFooter } from '@/components/navigation/screen-action-footer';
import {
  useTheme,
  useSession,
  useEmployeesRealtime,
  useWorkOrdersRealtime,
  useInventoryCatalog,
} from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import {
  canMechanicClaimWorkOrder,
  evaluateClaimEligibility,
  countOpenAssignedWorkOrders,
  DEFAULT_MAX_ACTIVE_WORK_ORDERS,
} from '@autocore/rbac';
import { resolveInventoryShelf } from '@/lib/inventory/resolve-shelf';
import { haptics, spacing, tokens } from '@/theme';
import { formatPrice } from '@/features/search/lib/format';
import { laborLineLabel } from '@/lib/work-order/composer-utils';
import { laborLineTotal } from '@/lib/work-order/labor-pricing';
import { nextStatuses, STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import { transitionWorkOrder, claimWorkOrder } from '@/services/api/work-orders';
import type { WorkOrderStatus } from '@/types/work-order';
import { openPhone } from '@/utils/open-phone';

import {
  ORDER_DETAIL_ACTION_TAB_HEIGHT,
  ORDER_DETAIL_ACTION_TAB_MARGIN_BOTTOM,
  ORDER_DETAIL_ACTION_TAB_MARGIN_X,
  OrderDetailActionStrip,
  OrderDetailActionTab,
} from './components/order-detail-action-tab';
import { OrderClaimSection } from './components/order-claim-section';
import {
  OrderStatusMoreSheet,
  type OrderStatusMoreSheetRef,
} from './components/order-status-more-sheet';
import { OrderStatusBadge } from './components/order-status-badge';
import { OrderDocumentsSection } from './components/order-documents-section';
import { OrderLinesList } from './components/order-lines-list';
import { OrderWorkflowProgress } from './components/order-workflow-progress';
import { navigateOrderEdit } from './lib/order-composition-nav';
import { formatOrderVehicleLine, formatWorkOrderLabel } from './lib/order-display';
import { wo, woFlatCard, woRuledSection, woType } from './theme/wo-visual';

type OrderDetailScreenProps = {
  orderId: string;
};

/** Compact labels so the primary CTA fits beside Call (+ More). */
function footerStatusLabel(status: WorkOrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Confirm';
    case 'in_progress':
      return 'Start';
    case 'waiting_parts':
      return 'Parts wait';
    case 'completed':
      return 'Complete';
    case 'delivered':
      return 'Deliver';
    default:
      return STATUS_LABELS[status];
  }
}

function footerStatusIcon(status: WorkOrderStatus): ComponentType<IconProps> {
  switch (status) {
    case 'confirmed':
      return CheckIcon;
    case 'in_progress':
      return WrenchIcon;
    case 'waiting_parts':
      return PackageIcon;
    case 'completed':
      return CheckCircle2Icon;
    case 'delivered':
      return CheckIcon;
    default:
      return CheckIcon;
  }
}

function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      onPress={onPress}
      style={{
        minHeight: tokens.control.hitTarget,
        minWidth: tokens.control.hitTarget,
        paddingHorizontal: tokens.space.inline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant="body"
        style={{ fontSize: 17, lineHeight: 22, fontWeight: '400', color: colors.primary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Rounded content block, inset from the page edges like every other card. */
function RuledSection({ title, children }: { title?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: wo.pad }}>
      {title ? (
        <Text
          variant="meta"
          style={{ ...woType.section, color: colors.mutedForeground, marginBottom: 8, marginLeft: 2 }}
        >
          {title}
        </Text>
      ) : null}
      <View style={woRuledSection(colors)}>{children}</View>
    </View>
  );
}

export function OrderDetailScreen({ orderId }: OrderDetailScreenProps) {
  const { colors, isDark } = useTheme();
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
  const moreSheetRef = useRef<OrderStatusMoreSheetRef>(null);

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

  if (!order) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="body" color="muted">
          Work order not found
        </Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Back
        </Button>
      </View>
    );
  }

  const setDomainStatus = async (status: WorkOrderStatus) => {
    if (!can('work_orders_edit')) {
      toast({ title: 'You do not have permission to edit this order', variant: 'warning' });
      return;
    }
    setTransitioning(true);
    haptics.light();
    try {
      await transitionWorkOrder(orderId, status);
      haptics.success();
      toast({
        title: STATUS_LABELS[status],
        description: `${formatWorkOrderLabel(order.number)} updated`,
        variant: 'success',
      });
    } catch (error) {
      haptics.warning();
      const raw = error instanceof Error ? error.message : 'Failed to update status';
      const isInvalid = /cannot move|недопустим|invalid transition/i.test(raw);
      toast({
        title: isInvalid ? 'Status change not allowed' : 'Failed to update status',
        description: raw,
        variant: 'destructive',
      });
    } finally {
      setTransitioning(false);
    }
  };

  const availableTransitions = domainOrder ? nextStatuses(domainOrder.status) : [];
  const statusActions = availableTransitions.filter((status) => status !== 'cancelled');
  const primaryStatus = statusActions[0];
  const secondaryStatuses = statusActions.slice(1);
  const canClaimBase =
    Boolean(domainOrder && uid) && canMechanicClaimWorkOrder(domainOrder!, uid!);
  const canClaim = canClaimBase && claimEligibility?.ok === true;
  const claimBlockedReason =
    canClaimBase && claimEligibility && !claimEligibility.ok ? claimEligibility.reason : undefined;
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
        title: 'Order claimed',
        description: `#${order.number} is now yours`,
        variant: 'success',
      });
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Failed to claim order',
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

  const laborLines =
    domainOrder?.laborLines.map((line) => ({
      id: line.id,
      label: laborLineLabel(line, employees),
      price: laborLineTotal(line),
    })) ?? [];
  const partLines =
    domainOrder?.partLines
      .filter((line) => line.source !== 'specific_quick')
      .map((line) => {
        const item = line.itemId ? inventoryById.get(line.itemId) : undefined;
        const shelf = item ? resolveInventoryShelf(item) : undefined;
        const detailParts = [line.sku, shelf ? `Shelf ${shelf}` : null].filter(Boolean);
        return {
          id: line.id,
          label: line.name,
          detail: detailParts.length ? detailParts.join(' · ') : undefined,
          price: line.quantity * line.unitPrice,
        };
      }) ?? [];
  const catalogLines =
    domainOrder?.partLines
      .filter((line) => line.source === 'specific_quick')
      .map((line) => ({
        id: line.id,
        label: line.specificCategoryName ? `${line.specificCategoryName} · ${line.name}` : line.name,
        price: line.quantity * line.unitPrice,
      })) ?? [];
  const motorLines =
    domainOrder?.motorLines.map((line) => ({
      id: line.id,
      label:
        [line.brandName, line.engineCode, line.serialCode].filter(Boolean).join(' ') || line.serialCode,
      detail: line.outcome === 'sell' ? 'Sale' : 'Installation',
      price: line.unitPrice,
    })) ?? [];

  const openEdit = useCallback(() => {
    haptics.selection();
    navigateOrderEdit(router, orderId);
  }, [orderId, router]);

  const openSecondaryStatuses = useCallback(() => {
    if (secondaryStatuses.length === 0) return;
    haptics.selection();
    moreSheetRef.current?.present();
  }, [secondaryStatuses.length]);

  const headerRight = useCallback(() => {
    if (!canEditOrder) return null;
    return <HeaderTextButton label="Edit" onPress={openEdit} />;
  }, [canEditOrder, openEdit]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Native nav bar: system back gesture and button, translucent on scroll. */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: formatWorkOrderLabel(order.number),
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.foreground },
          headerShadowVisible: false,
          headerRight,
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // Capsule sits on the NativeTabs plane (pageSheet — no extra safeBottom).
          paddingBottom:
            ORDER_DETAIL_ACTION_TAB_HEIGHT +
            ORDER_DETAIL_ACTION_TAB_MARGIN_BOTTOM +
            spacing[3],
          gap: 0,
        }}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <View
          style={{
            marginHorizontal: wo.pad,
            marginTop: wo.stackGap,
            ...woFlatCard(colors, { isDark }),
            paddingHorizontal: wo.cardPadX,
            paddingVertical: wo.cardPadY,
            gap: 14,
          }}
        >
          <View style={{ gap: 8 }}>
            {/* Status moved out of the custom header into the hero when the nav
                bar became native — the native bar owns title and actions only. */}
            <OrderStatusBadge status={order.status} size="md" />
            <Text variant="pageTitle" style={woType.heroClient}>
              {order.customer}
            </Text>
            {order.phone ? (
              <Text variant="body" color="muted">
                {order.phone}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              borderTopWidth: wo.rule,
              borderBottomWidth: wo.rule,
              borderColor: colors.border,
              paddingVertical: 10,
              gap: 4,
            }}
          >
            <Text variant="bodyStrong" style={woType.vehicleLine}>
              {order.vehicle}
            </Text>
            <Text variant="caption" color="muted" style={woType.meta}>
              {[order.engine !== '—' ? order.engine : null, formatOrderVehicleLine(order)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>

          {/* The workflow track below already names the stage, so the total is
              the only thing this row needs to say. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text variant="meta" style={{ ...woType.overline, color: colors.mutedForeground }}>
              Total
            </Text>
            <Text variant="title" style={{ ...woType.price, fontSize: 26, lineHeight: 31 }}>
              {formatPrice(order.price)}
            </Text>
          </View>

          <OrderWorkflowProgress status={order.status} />
        </View>

        {canClaimBase ? (
          <View style={{ marginTop: wo.sectionGap }}>
            <RuledSection title="Claim">
              <OrderClaimSection
                orderNumber={order.number}
                unassignedCount={unassignedLaborCount}
                claiming={claiming}
                blockedReason={claimBlockedReason}
                onClaim={() => void handleClaim()}
              />
            </RuledSection>
          </View>
        ) : null}

        <View style={{ marginTop: wo.sectionGap, gap: wo.sectionGap }}>
          <RuledSection title="Contents">
            <OrderLinesList
              laborLines={laborLines}
              partLines={partLines}
              catalogLines={catalogLines}
              motorLines={motorLines}
            />
          </RuledSection>

          {domainOrder && can('work_orders_view') ? (
            <RuledSection title="Documents">
              <OrderDocumentsSection order={domainOrder} colors={colors} />
            </RuledSection>
          ) : null}

          <RuledSection title="Activity">
            {order.timeline.map((event, index) => {
              const isLast = index === order.timeline.length - 1;
              const Icon = event.done ? CheckCircle2Icon : ClockIcon;
              const tint = event.done ? colors.primary : colors.mutedForeground;

              return (
                <View key={event.id} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', width: 22 }}>
                    <Icon size="sm" color={tint} strokeWidth={1.85} />
                    {!isLast ? (
                      <View
                        style={{
                          width: 1,
                          flex: 1,
                          minHeight: 18,
                          backgroundColor: colors.border,
                          marginVertical: 4,
                        }}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: isLast ? 0 : 10 }}>
                    <Text variant="body" style={{ fontSize: 14, fontWeight: '600' }}>
                      {event.title}
                    </Text>
                    <Text variant="caption" color="muted">
                      {event.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </RuledSection>

          {order.partsNote ? (
            <RuledSection title="Parts note">
              <Text variant="body">{order.partsNote}</Text>
            </RuledSection>
          ) : null}
        </View>
      </ScrollView>

      <ScreenActionFooter
        absolute
        aboveTabBar={false}
        chrome="plain"
        horizontalPadding={ORDER_DETAIL_ACTION_TAB_MARGIN_X}
        style={{
          // PageSheet already clears the home indicator; full safeBottom
          // double-pads and lifts the strip above the tab plane.
          paddingTop: 0,
          paddingBottom: ORDER_DETAIL_ACTION_TAB_MARGIN_BOTTOM,
        }}
      >
        <OrderDetailActionStrip>
          {order.phone ? (
            <OrderDetailActionTab
              contentKey="call"
              label="Call"
              icon={PhoneIcon}
              accessibilityLabel={`Call ${order.customer}`}
              onPress={() => {
                void openPhone(order.phone);
              }}
            />
          ) : null}

          {primaryStatus ? (
            <OrderDetailActionTab
              contentKey={primaryStatus}
              label={footerStatusLabel(primaryStatus)}
              icon={footerStatusIcon(primaryStatus)}
              active
              loading={transitioning}
              disabled={transitioning}
              onPress={() => void setDomainStatus(primaryStatus)}
            />
          ) : null}

          {secondaryStatuses.length > 0 ? (
            <OrderDetailActionTab
              contentKey="more"
              label="More"
              icon={EllipsisIcon}
              disabled={transitioning}
              onPress={openSecondaryStatuses}
            />
          ) : null}

          {!canEditOrder && !primaryStatus ? (
            <OrderDetailActionTab
              contentKey="done"
              label="Done"
              icon={CheckIcon}
              onPress={() => router.back()}
            />
          ) : null}
        </OrderDetailActionStrip>
      </ScreenActionFooter>

      {secondaryStatuses.length > 0 ? (
        <OrderStatusMoreSheet
          ref={moreSheetRef}
          statuses={secondaryStatuses}
          statusIcon={footerStatusIcon}
          busy={transitioning}
          onSelect={(status) => void setDomainStatus(status)}
        />
      ) : null}
    </View>
  );
}
