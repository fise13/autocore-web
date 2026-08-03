import { memo, useCallback, useMemo, useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { View as RNView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CheckIcon } from '@/assets/icons';
import { Text, toast, type IosLiftMenuItem } from '@/components/ui';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';
import { formatPrice } from '@/features/search/lib/format';

import { useOrderTransition } from '../animation/order-transition-context';
import type { OrderRowPosition } from '../lib/group-orders';
import { navigateOrderEdit } from '../lib/order-composition-nav';
import { formatOrderListVehicleLine, formatWorkOrderLabel } from '../lib/order-display';
import { canMarkCompleted } from '../lib/transition-messages';
import { resolveStatusInk } from '../lib/status';
import { wo } from '../theme/wo-visual';
import type { WorkOrder } from '../types';
import { useOrdersLift } from './orders-lift-provider';

type OrderRowProps = {
  order: WorkOrder;
  position?: OrderRowPosition;
  onComplete: (order: WorkOrder) => void;
  onEnterEdit: (order: WorkOrder) => void;
  editing?: boolean;
  selected?: boolean;
  onToggleSelect?: (order: WorkOrder) => void;
  canEdit?: boolean;
};

const SF: Record<'check' | 'edit', SFSymbol> = {
  check: 'checkmark',
  edit: 'pencil',
};

const SWIPE_WIDTH = wo.swipeActionWidth;
const LONG_PRESS_MS = Platform.OS === 'ios' ? 380 : 450;

const pressTiming = {
  duration: 140,
  easing: Easing.out(Easing.cubic),
};

function ActionGlyph({
  icon,
  color,
  size,
}: {
  icon: 'check' | 'edit';
  color: string;
  size: number;
}) {
  return (
    <SymbolView
      name={SF[icon]}
      size={size}
      weight="semibold"
      tintColor={color}
      fallback={
        icon === 'check' ? (
          <CheckIcon size="sm" color={color} strokeWidth={1.75} />
        ) : (
          <Text variant="headline" style={{ color, fontWeight: '700' }}>
            ✎
          </Text>
        )
      }
    />
  );
}

function MailSwipeAction({
  label,
  background,
  foreground,
  icon,
  onPress,
}: {
  label: string;
  background: string;
  foreground: string;
  icon: 'check' | 'edit';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: SWIPE_WIDTH,
        flex: 1,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      <ActionGlyph icon={icon} color={foreground} size={22} />
      <Text
        variant="caption2"
        style={{ color: foreground, fontWeight: '600', letterSpacing: -0.05 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function cornerRadiusFor(position: OrderRowPosition): {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
} {
  const r = tokens.radius.group;
  if (position === 'only') {
    return {
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: r,
    };
  }
  if (position === 'first') {
    return {
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    };
  }
  if (position === 'last') {
    return {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: r,
    };
  }
  return {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  };
}

function OrderRowBody({
  order,
  editing,
  selected,
  showSeparator,
}: {
  order: WorkOrder;
  editing: boolean;
  selected: boolean;
  showSeparator: boolean;
}) {
  const { colors } = useTheme();
  const ink = resolveStatusInk(colors, order.status);
  const vehicleLine = formatOrderListVehicleLine(order);

  return (
    <View
      style={{
        minHeight: wo.rowMinHeight,
        paddingHorizontal: wo.cardPadX,
        paddingVertical: wo.rowPadY,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.stack,
        borderBottomWidth: showSeparator ? tokens.control.hairline : 0,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space.stack,
          minWidth: 0,
        }}
      >
        {editing ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1.5,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected ? (
              <CheckIcon size="xs" color={colors.primaryForeground} strokeWidth={2.4} />
            ) : null}
          </View>
        ) : null}

        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              variant="caption1"
              style={{
                fontWeight: '600',
                color: colors.mutedForeground,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatWorkOrderLabel(order.number)}
            </Text>
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: wo.radiusPill,
                backgroundColor: ink.subtle,
              }}
            >
              <Text
                variant="caption2"
                style={{ fontWeight: '600', color: ink.onSubtle, letterSpacing: -0.05 }}
              >
                {ink.label}
              </Text>
            </View>
          </View>

          <Text
            variant="body"
            numberOfLines={1}
            style={{
              fontSize: 17,
              lineHeight: 22,
              fontWeight: '600',
              letterSpacing: -0.35,
              color: colors.foreground,
            }}
          >
            {order.customer}
          </Text>

          <Text variant="footnote" numberOfLines={1} style={{ color: colors.mutedForeground }}>
            {[vehicleLine || order.vehicle || null, order.createdAt].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4, paddingLeft: 4 }}>
          <Text
            variant="subheadline"
            style={{
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              letterSpacing: -0.2,
              color: colors.foreground,
            }}
          >
            {formatPrice(order.price)}
          </Text>
          <Text variant="caption2" numberOfLines={1} style={{ color: colors.mutedForeground }}>
            {order.isUnassigned ? 'Unassigned' : order.assignee ? order.assignee : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Mail-style work-order row.
 * Tap → detail. Long-press → screen-level iOS Lift Menu (Notes / Mail style).
 */
export const OrderRow = memo(function OrderRow({
  order,
  position = 'only',
  onComplete,
  onEnterEdit,
  editing = false,
  selected = false,
  onToggleSelect,
  canEdit = true,
}: OrderRowProps) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const router = useRouter();
  const { openOrder } = useOrderTransition();
  const { openLift, closeLift, activeOrderId } = useOrdersLift();
  const rowRef = useRef<RNView>(null);
  const press = useSharedValue(0);
  const longPressLock = useRef(false);

  const canComplete = canMarkCompleted(order.status);
  const canOpenComposer = order.status === 'draft' || order.status === 'confirmed';
  const corners = cornerRadiusFor(position);
  const showSeparator = position === 'first' || position === 'middle';
  const pressedFill = isDark ? withAlpha(colors.muted, 0.55) : withAlpha(colors.muted, 0.9);
  const idleFill = selected ? colors.secondary : colors.card;
  const menuOpen = activeOrderId === order.id;

  const pressStyle = useAnimatedStyle(() => {
    if (motion.reduced) {
      return {
        backgroundColor: press.value > 0.5 ? pressedFill : idleFill,
      };
    }
    return {
      backgroundColor: interpolateColor(press.value, [0, 1], [idleFill, pressedFill]),
    };
  });

  const setPressed = useCallback(
    (next: number) => {
      press.value = withTiming(next, motion.reduced ? { duration: 80 } : pressTiming);
    },
    [motion.reduced, press],
  );

  const handleOpen = useCallback(() => {
    closeLift();
    rowRef.current?.measureInWindow((x, y, width, height) => {
      openOrder(order, { x, y, width, height });
    });
  }, [closeLift, openOrder, order]);

  const handlePress = useCallback(() => {
    if (longPressLock.current) {
      longPressLock.current = false;
      return;
    }
    if (editing) {
      haptics.selection();
      onToggleSelect?.(order);
      return;
    }
    handleOpen();
  }, [editing, handleOpen, onToggleSelect, order]);

  const copyWo = useCallback(async () => {
    const label = formatWorkOrderLabel(order.number);
    await Clipboard.setStringAsync(label);
    toast({ title: `${label} copied`, variant: 'success' });
  }, [order.number]);

  const openLiftMenu = useCallback(() => {
    if (editing || menuOpen) return;
    longPressLock.current = true;
    setPressed(0);

    const present = (x: number, y: number, width: number, height: number) => {
      haptics.medium();
      const items: IosLiftMenuItem[] = [];
      if (canEdit && canOpenComposer) {
        items.push({
          label: 'Edit',
          systemImage: 'pencil',
          onPress: () => navigateOrderEdit(router, order.id),
        });
      }
      if (canEdit) {
        items.push({
          label: 'Select',
          systemImage: 'checkmark.circle',
          onPress: () => onEnterEdit(order),
        });
      }
      if (canComplete) {
        items.push({
          label: 'Mark Completed',
          systemImage: 'checkmark.circle.fill',
          onPress: () => onComplete(order),
        });
      }
      items.push({
        label: 'Copy WO #',
        systemImage: 'doc.on.doc',
        onPress: () => void copyWo(),
      });

      openLift({
        orderId: order.id,
        anchor: { x, y, width, height },
        menuPlacement: 'auto',
        items,
        previewStyle: {
          borderRadius: tokens.radius.group,
          backgroundColor: colors.card,
        },
        preview: (
          <OrderRowBody order={order} editing={false} selected={false} showSeparator={false} />
        ),
      });
    };

    const node = rowRef.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      present(x, y, width, height);
    });
  }, [
    canComplete,
    canEdit,
    canOpenComposer,
    colors.card,
    copyWo,
    editing,
    menuOpen,
    onComplete,
    onEnterEdit,
    openLift,
    order,
    router,
    setPressed,
  ]);

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(!editing && !menuOpen)
        .minDuration(LONG_PRESS_MS)
        .maxDistance(14)
        .onStart(() => {
          runOnJS(openLiftMenu)();
        }),
    [editing, menuOpen, openLiftMenu],
  );

  const pressable = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: editing ? selected : undefined }}
      accessibilityLabel={`${formatWorkOrderLabel(order.number)}, ${order.customer}`}
      onPressIn={() => {
        if (!menuOpen) setPressed(1);
      }}
      onPressOut={() => setPressed(0)}
      onPress={handlePress}
      style={{
        marginHorizontal: tokens.space.screenX,
        overflow: 'hidden',
        opacity: menuOpen ? 0 : 1,
        ...corners,
      }}
    >
      <Animated.View style={pressStyle}>
        <View ref={rowRef} collapsable={false}>
          <OrderRowBody
            order={order}
            editing={editing}
            selected={selected}
            showSeparator={showSeparator}
          />
        </View>
      </Animated.View>
    </Pressable>
  );

  if (editing || !canEdit) {
    return <GestureDetector gesture={longPressGesture}>{pressable}</GestureDetector>;
  }

  // Long-press detector wraps Swipeable so the lift menu wins over pan when
  // the finger stays still — true iOS Notes / Mail behaviour.
  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View>
        <ReanimatedSwipeable
          friction={2}
          overshootFriction={8}
          rightThreshold={40}
          leftThreshold={40}
          enabled={!menuOpen}
          containerStyle={{ overflow: 'visible' }}
          renderRightActions={() => {
            if (!canComplete) return null;
            return (
              <View
                style={{
                  paddingRight: tokens.space.screenX,
                  ...corners,
                  overflow: 'hidden',
                }}
              >
                <MailSwipeAction
                  label="Done"
                  icon="check"
                  background={colors.success}
                  foreground={colors.successForeground}
                  onPress={() => {
                    haptics.medium();
                    onComplete(order);
                  }}
                />
              </View>
            );
          }}
          renderLeftActions={() => (
            <View
              style={{
                paddingLeft: tokens.space.screenX,
                ...corners,
                overflow: 'hidden',
              }}
            >
              <MailSwipeAction
                label="Edit"
                icon="edit"
                background={colors.primary}
                foreground={colors.primaryForeground}
                onPress={() => {
                  haptics.medium();
                  onEnterEdit(order);
                }}
              />
            </View>
          )}
        >
          {pressable}
        </ReanimatedSwipeable>
      </Animated.View>
    </GestureDetector>
  );
});
