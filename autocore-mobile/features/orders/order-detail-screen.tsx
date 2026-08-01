import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  CheckCircle2Icon,
  ClipboardListIcon,
  ClockIcon,
  PhoneIcon,
} from '@/assets/icons';
import { Button, Text, toast } from '@/components/ui';
import { ScreenActionFooter } from '@/components/navigation/screen-action-footer';
import {
  useTheme,
  useSession,
  useEmployeesRealtime,
  useWorkOrdersRealtime,
  useInventoryCatalog,
} from '@/hooks';
import { SCREEN_ACTION_FOOTER_HEIGHT } from '@/lib/navigation/floating-tab-bar-inset';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import {
  canMechanicClaimWorkOrder,
  evaluateClaimEligibility,
  countOpenAssignedWorkOrders,
  DEFAULT_MAX_ACTIVE_WORK_ORDERS,
} from '@autocore/rbac';
import { resolveInventoryShelf } from '@/lib/inventory/resolve-shelf';
import { haptics } from '@/theme';
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
import { formatOrderVehicleLine, formatWorkOrderLabel } from './lib/order-display';
import { wo, woFlatCard, woRuledSection, woType } from './theme/wo-visual';

type OrderDetailScreenProps = {
  orderId: string;
};

/** Every footer control shares this height so the circle and the pill line up. */
const FOOTER_ACTION_HEIGHT = 52;

const FOOTER_BUTTON_STYLE = {
  width: '100%',
  minHeight: FOOTER_ACTION_HEIGHT,
  borderRadius: 16,
} as const;

/**
 * `Button` applies the caller's `style` to its inner view, so `flex` on it does
 * nothing — the stretching has to happen on a wrapper.
 */
function FooterAction({ children, grow = 1 }: { children: ReactNode; grow?: number }) {
  return <View style={{ flex: grow }}>{children}</View>;
}

function FooterCallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          width: FOOTER_ACTION_HEIGHT,
          height: FOOTER_ACTION_HEIGHT,
          borderRadius: FOOTER_ACTION_HEIGHT / 2,
          // The footer sits on `background`; `secondary` is too close to it to
          // read as a button, so the circle takes the card surface.
          alignSelf: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.card,
          borderWidth: wo.rule,
          borderColor: colors.border,
        },
        pressed ? { backgroundColor: colors.muted } : null,
      ]}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      <SymbolView
        name="phone.fill"
        size={22}
        weight="semibold"
        tintColor={colors.foreground}
        fallback={<PhoneIcon size="md" color={colors.foreground} strokeWidth={2} />}
      />
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

  const heroStyle = useOrderDetailHeroEnter(40);
  const contentStyle = useOrderDetailContentEnter(140);

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
      toast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setTransitioning(false);
    }
  };

  const availableTransitions = domainOrder ? nextStatuses(domainOrder.status) : [];
  const primaryTransition = availableTransitions[0];
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

  const openEdit = () => {
    haptics.selection();
    navigateOrderEdit(router, orderId);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Native nav bar: system back gesture and button, translucent on scroll. */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: formatWorkOrderLabel(order.number),
          headerTransparent: true,
          headerBlurEffect: isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight',
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.foreground },
          headerShadowVisible: false,
          headerRight: canEditOrder
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit work order"
                  hitSlop={10}
                  onPress={openEdit}
                >
                  <SymbolView
                    name="square.and.pencil"
                    size={21}
                    weight="semibold"
                    tintColor={colors.primary}
                    fallback={
                      <ClipboardListIcon size="sm" color={colors.primary} strokeWidth={1.85} />
                    }
                  />
                </Pressable>
              )
            : undefined,
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // The native tab bar contributes its own content inset, so this only
          // has to clear the sticky action footer.
          paddingBottom: SCREEN_ACTION_FOOTER_HEIGHT + wo.sectionGap,
          gap: 0,
        }}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <Animated.View
          style={[
            {
              marginHorizontal: wo.pad,
              marginTop: wo.stackGap,
              ...woFlatCard(colors, { isDark }),
              paddingHorizontal: wo.cardPadX,
              paddingVertical: wo.cardPadY,
              gap: 14,
            },
            heroStyle,
          ]}
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
        </Animated.View>

        {canClaimBase ? (
          <Animated.View style={[{ marginTop: wo.sectionGap }, contentStyle]}>
            <RuledSection title="Claim">
              <OrderClaimSection
                orderNumber={order.number}
                unassignedCount={unassignedLaborCount}
                claiming={claiming}
                blockedReason={claimBlockedReason}
                onClaim={() => void handleClaim()}
              />
            </RuledSection>
          </Animated.View>
        ) : null}

        <Animated.View style={[{ marginTop: wo.sectionGap, gap: wo.sectionGap }, contentStyle]}>
          <RuledSection title="Contents">
            <OrderLinesList
              laborLines={laborLines}
              partLines={partLines}
              catalogLines={catalogLines}
              motorLines={motorLines}
            />
          </RuledSection>

          {availableTransitions.length > 1 ? (
            <RuledSection title="Workflow">
              <View style={{ gap: 6 }}>
                {availableTransitions.slice(1).map((status) => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    disabled={transitioning}
                    onPress={() => void setDomainStatus(status)}
                    style={{
                      minHeight: wo.touch,
                      borderRadius: wo.radiusSm,
                      borderWidth: wo.rule,
                      borderColor: colors.border,
                      backgroundColor: colors.secondary,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      opacity: transitioning ? 0.55 : 1,
                    }}
                  >
                    <ClockIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
                    <Text variant="caption" style={{ fontWeight: '600' }}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </RuledSection>
          ) : null}

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
        </Animated.View>
      </ScrollView>

      <ScreenActionFooter absolute>
        {order.phone ? (
          <FooterCallButton
            label={`Call ${order.customer}`}
            onPress={() => {
              haptics.selection();
              void openPhone(order.phone);
            }}
          />
        ) : null}

        {canEditOrder ? (
          <FooterAction>
            <Button variant="secondary" onPress={openEdit} style={FOOTER_BUTTON_STYLE}>
              Edit
            </Button>
          </FooterAction>
        ) : null}

        {primaryTransition ? (
          // The transition is the one thing worth doing here, so it takes the
          // filled treatment and twice the width of any secondary beside it.
          <FooterAction grow={canEditOrder ? 2 : 1}>
            <Button
              variant="default"
              loading={transitioning}
              disabled={transitioning}
              onPress={() => void setDomainStatus(primaryTransition)}
              style={FOOTER_BUTTON_STYLE}
            >
              {STATUS_LABELS[primaryTransition]}
            </Button>
          </FooterAction>
        ) : canEditOrder ? null : (
          <FooterAction>
            <Button variant="secondary" onPress={() => router.back()} style={FOOTER_BUTTON_STYLE}>
              Done
            </Button>
          </FooterAction>
        )}
      </ScreenActionFooter>
    </View>
  );
}
