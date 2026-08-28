import { memo, useCallback, useRef, useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, View } from 'react-native';
import type { View as RNView } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CheckIcon, PhoneIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';
import { formatPrice } from '@/features/search/lib/format';
import { useMoneyFormatRevision } from '@/store/money-format-store';

import { useOrderTransition } from '../animation/order-transition-context';
import { useOrdersEnter } from '../animation/use-orders-enter';
import { ordersTimeline } from '../animation/orders-timeline';
import { formatOrderVehicleLine, formatWorkOrderLabel } from '../lib/order-display';
import { resolveStatusInk } from '../lib/status';
import { wo, woFlatCard, woType } from '../theme/wo-visual';
import type { WorkOrder } from '../types';

type OrderCardProps = {
  order: WorkOrder;
  index: number;
  onComplete: (order: WorkOrder) => void;
  onCall: (order: WorkOrder) => void;
};

const ANIMATE_FIRST = 8;

function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return '—';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

const SF: Record<'check' | 'phone', SFSymbol> = {
  check: 'checkmark',
  phone: 'phone.fill',
};

/** SF Symbol with the app's own icon as the non-iOS fallback. */
function ActionGlyph({
  icon,
  color,
  size,
}: {
  icon: 'check' | 'phone';
  color: string;
  size: number;
}) {
  const Fallback = icon === 'check' ? CheckIcon : PhoneIcon;
  return (
    <SymbolView
      name={SF[icon]}
      size={size}
      weight="semibold"
      tintColor={color}
      fallback={<Fallback size={size > 18 ? 'md' : 'sm'} color={color} strokeWidth={2.2} />}
    />
  );
}

/** Rounded swipe tile — matches the card's corner radius instead of a flat slab. */
function SwipeAction({
  label,
  background,
  foreground,
  icon,
  onPress,
}: {
  label: string;
  background: string;
  foreground: string;
  icon: 'check' | 'phone';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 76,
        marginLeft: 8,
        borderRadius: wo.radius,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
      }}
    >
      <ActionGlyph icon={icon} color={foreground} size={20} />
      <Text variant="meta" style={{ ...woType.statusPill, color: foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Circular quick action on the card footer — discoverable without shouting. */
function QuickAction({
  label,
  background,
  foreground,
  border,
  icon,
  onPress,
}: {
  label: string;
  background: string;
  foreground: string;
  border: string;
  icon: 'check' | 'phone';
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // Static object, not a `({ pressed }) => …` function. NativeWind's JSX
      // runtime normalises `style` before Pressable sees it and drops a
      // function, taking the whole style object — layout included — with it.
      style={{
        width: wo.quickAction,
        height: wo.quickAction,
        borderRadius: wo.quickAction / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        borderWidth: wo.rule,
        borderColor: border,
        opacity: pressed ? tokens.opacity.pressed : 1,
      }}
    >
      <ActionGlyph icon={icon} color={foreground} size={16} />
    </Pressable>
  );
}

export const OrderCard = memo(function OrderCard({
  order,
  index,
  onComplete,
  onCall,
}: OrderCardProps) {
  const { colors, isDark } = useTheme();
  useMoneyFormatRevision();
  const { openOrder } = useOrderTransition();
  const cardRef = useRef<RNView>(null);
  const [rowPressed, setRowPressed] = useState(false);
  const animate = index < ANIMATE_FIRST;
  const enterStyle = useOrdersEnter({
    delay: animate ? ordersTimeline.listBase + index * ordersTimeline.listStagger : 0,
    translateY: animate ? 8 : 0,
    enabled: animate,
  });

  const ink = resolveStatusInk(colors, order.status);
  const solid = ink.emphasis === 'solid';
  const canComplete =
    order.status !== 'completed' &&
    order.status !== 'delivered' &&
    order.status !== 'cancelled';
  const canCall = Boolean(order.phone);
  const hasFooter = canComplete || canCall || Boolean(order.assignee) || Boolean(order.isUnassigned);

  const handleOpen = useCallback(() => {
    haptics.light();
    cardRef.current?.measureInWindow((x, y, width, height) => {
      openOrder(order, { x, y, width, height });
    });
  }, [openOrder, order]);

  /** Long press opens the system action sheet, the iOS way to reach row actions. */
  const showActions = useCallback(() => {
    if (Platform.OS !== 'ios') return;

    const labels = ['Open work order'];
    const actions: (() => void)[] = [handleOpen];
    if (canCall) {
      labels.push('Call customer');
      actions.push(() => onCall(order));
    }
    if (canComplete) {
      labels.push('Mark completed');
      actions.push(() => onComplete(order));
    }
    labels.push('Cancel');

    haptics.medium();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `${formatWorkOrderLabel(order.number)} · ${order.customer}`,
        options: labels,
        cancelButtonIndex: labels.length - 1,
      },
      (selected) => actions[selected]?.(),
    );
  }, [canCall, canComplete, handleOpen, onCall, onComplete, order]);

  const plate = formatOrderVehicleLine(order);
  const vehicleLine = [
    order.vehicle,
    order.engine !== '—' ? order.engine : null,
    plate && plate !== order.vehicle ? plate : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const card = (
    <View>
      {/* Selection is a UIKit-style highlight, not a scale — the row tints on
          touch down and snaps back on release. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatWorkOrderLabel(order.number)}, ${order.customer}, ${ink.label}`}
        onPress={handleOpen}
        onLongPress={showActions}
        delayLongPress={350}
        onPressIn={() => setRowPressed(true)}
        onPressOut={() => setRowPressed(false)}
        // Static object, not a `({ pressed }) => …` function. NativeWind's JSX
        // runtime normalises `style` before Pressable sees it and drops a
        // function, taking the whole style object — layout included — with it.
        style={{
          ...woFlatCard(colors, { borderColor: ink.cardBorder, isDark }),
          backgroundColor: rowPressed ? colors.secondary : colors.card,
        }}
      >
        <View
          ref={cardRef}
          collapsable={false}
          style={{ paddingHorizontal: wo.cardPadX, paddingVertical: wo.cardPadY, gap: 10 }}
        >
          {/* Status leads the row; identity and time trail it. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: wo.radiusPill,
                backgroundColor: solid ? ink.solid : ink.subtle,
                borderWidth: wo.rule,
                borderColor: solid ? 'transparent' : ink.border,
              }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: solid ? ink.onSolid : ink.solid,
                }}
              />
              <Text
                variant="meta"
                style={{ ...woType.statusPill, color: solid ? ink.onSolid : ink.onSubtle }}
              >
                {ink.label}
              </Text>
            </View>

            <Text
              variant="meta"
              numberOfLines={1}
              style={{ ...woType.woNumber, color: colors.mutedForeground }}
            >
              {formatWorkOrderLabel(order.number)} · {order.createdAt}
            </Text>
          </View>

          {/* Customer and money — the two things read from across the shop. */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="bodyStrong" style={woType.clientName} numberOfLines={1}>
                {order.customer}
              </Text>
              {vehicleLine ? (
                <Text variant="caption" color="muted" style={woType.vehicleLine} numberOfLines={1}>
                  {vehicleLine}
                </Text>
              ) : null}
            </View>
            <Text variant="bodyStrong" style={{ ...woType.price, color: colors.foreground }}>
              {formatPrice(order.price)}
            </Text>
          </View>

          {hasFooter ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                paddingTop: 10,
                borderTopWidth: wo.rule,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                {order.isUnassigned ? (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: wo.radiusPill,
                      backgroundColor: colors.warningSubtle,
                      borderWidth: wo.rule,
                      borderColor: colors.warningBorder,
                    }}
                  >
                    <Text
                      variant="meta"
                      style={{ ...woType.statusPill, color: colors.warningOnSubtle }}
                    >
                      Unassigned
                    </Text>
                  </View>
                ) : order.assignee ? (
                  <>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: order.isAssignedToMe
                          ? colors.primarySubtle
                          : colors.secondary,
                        borderWidth: wo.rule,
                        borderColor: order.isAssignedToMe ? colors.primaryBorder : colors.border,
                      }}
                    >
                      <Text
                        variant="meta"
                        style={{
                          fontSize: 9.5,
                          fontWeight: '700',
                          letterSpacing: 0.2,
                          color: order.isAssignedToMe
                            ? colors.primaryOnSubtle
                            : colors.mutedForeground,
                        }}
                      >
                        {initialsOf(order.assignee)}
                      </Text>
                    </View>
                    <Text
                      variant="caption"
                      color="muted"
                      style={woType.meta}
                      numberOfLines={1}
                    >
                      {order.isAssignedToMe ? 'You' : order.assignee}
                    </Text>
                  </>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {canCall ? (
                  <QuickAction
                    label={`Call ${order.customer}`}
                    icon="phone"
                    background={colors.secondary}
                    foreground={colors.foreground}
                    border={colors.border}
                    onPress={() => {
                      haptics.light();
                      onCall(order);
                    }}
                  />
                ) : null}
                {canComplete ? (
                  <QuickAction
                    label="Mark completed"
                    icon="check"
                    background={colors.successSubtle}
                    foreground={colors.successOnSubtle}
                    border={colors.successBorder}
                    onPress={() => {
                      haptics.medium();
                      onComplete(order);
                    }}
                  />
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );

  return (
    <Animated.View style={enterStyle}>
      <ReanimatedSwipeable
        friction={2}
        overshootFriction={8}
        rightThreshold={40}
        renderRightActions={() => {
          if (!canComplete && !canCall) return null;
          return (
            <View style={{ flexDirection: 'row' }}>
              {canComplete ? (
                <SwipeAction
                  label="Done"
                  icon="check"
                  background={colors.success}
                  foreground={colors.successForeground}
                  onPress={() => {
                    haptics.medium();
                    onComplete(order);
                  }}
                />
              ) : null}
              {canCall ? (
                <SwipeAction
                  label="Call"
                  icon="phone"
                  background={colors.primary}
                  foreground={colors.primaryForeground}
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
