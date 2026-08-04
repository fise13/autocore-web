import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentType,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { IconProps } from '@/assets/icons/create-icon';
import { Text } from '@/components/ui';
import { useModalBottomSheet, useReducedMotion, useTheme } from '@/hooks';
import { STATUS_LABELS } from '@/lib/work-order/work-order-utils';
import { autocoreEase, duration, haptics, tokens } from '@/theme';
import type { WorkOrderStatus } from '@/types/work-order';

export type OrderStatusMoreSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type OrderStatusMoreSheetProps = {
  statuses: WorkOrderStatus[];
  statusIcon: (status: WorkOrderStatus) => ComponentType<IconProps>;
  onSelect: (status: WorkOrderStatus) => void;
  busy?: boolean;
};

/**
 * Compact status picker for the WO footer “More” action —
 * spring sheet with icon rows instead of a plain ActionSheet.
 */
export const OrderStatusMoreSheet = forwardRef<OrderStatusMoreSheetRef, OrderStatusMoreSheetProps>(
  function OrderStatusMoreSheet({ statuses, statusIcon, onSelect, busy = false }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet({ backdropOpacity: 0.4 });
    const sheetRef = useRef<BottomSheetModalType>(null);
    const reducedMotion = useReducedMotion();

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const snapPoints = useMemo(() => {
      const rows = Math.max(statuses.length, 1);
      const estimated = 72 + rows * 56 + sheet.sheetContentBottom + 8;
      return [Math.min(Math.max(estimated, 180), 420)];
    }, [sheet.sheetContentBottom, statuses.length]);

    const handleSelect = useCallback(
      (status: WorkOrderStatus) => {
        haptics.selection();
        sheetRef.current?.dismiss();
        onSelect(status);
      },
      [onSelect],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={snapPoints}
        topInset={sheet.topInset}
        enablePanDownToClose
        backdropComponent={sheet.renderBackdrop}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
        animationConfigs={{
          damping: tokens.motion.springs.sheet.damping,
          stiffness: tokens.motion.springs.sheet.stiffness,
          mass: tokens.motion.springs.sheet.mass,
          overshootClamping: true,
        }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: tokens.space.screenX,
            paddingBottom: sheet.sheetContentBottom,
            gap: tokens.space.stack,
          }}
        >
          <View style={{ gap: 4, paddingTop: tokens.space.micro }}>
            <Text
              variant="headline"
              style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.4 }}
            >
              Change status
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 14, lineHeight: 19 }}>
              Pick the next step for this work order
            </Text>
          </View>

          <View
            style={{
              borderRadius: tokens.radius.group,
              backgroundColor: colors.secondary,
              overflow: 'hidden',
            }}
          >
            {statuses.map((status, index) => {
              const Icon = statusIcon(status);
              const entering = reducedMotion
                ? undefined
                : FadeInDown.delay(index * 36)
                    .duration(duration.fast)
                    .easing(autocoreEase)
                    .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });

              return (
                <Animated.View key={status} entering={entering}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={STATUS_LABELS[status]}
                    disabled={busy}
                    onPress={() => handleSelect(status)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      minHeight: 56,
                      paddingHorizontal: 16,
                      opacity: busy ? tokens.opacity.disabled : pressed ? 0.72 : 1,
                      borderBottomWidth:
                        index < statuses.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.border,
                    })}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.card,
                      }}
                    >
                      <Icon size="md" color={colors.primary} strokeWidth={1.85} />
                    </View>
                    <Text
                      variant="body"
                      style={{
                        flex: 1,
                        fontSize: 17,
                        fontWeight: '500',
                        letterSpacing: -0.3,
                      }}
                    >
                      {STATUS_LABELS[status]}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
