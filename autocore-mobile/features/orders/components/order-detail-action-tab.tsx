import type { ComponentType, ReactNode } from 'react';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { IconProps } from '@/assets/icons/create-icon';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks';
import { autocoreEase, duration, haptics, spacing, spring, tokens } from '@/theme';

/** Matches NativeTabs labelStyle — 10pt / semibold. */
const TAB_LABEL_STYLE = {
  fontSize: 10,
  lineHeight: 12,
  fontWeight: '600' as const,
};

/** Native tab capsule row height (inner action row). */
export const ORDER_DETAIL_ACTION_TAB_HEIGHT = 50;

/** Horizontal inset so the strip floats like the iOS tab capsule. */
export const ORDER_DETAIL_ACTION_TAB_MARGIN_X = spacing[4];

/**
 * Gap under the capsule on the pageSheet.
 * Keep tiny — full `safeBottom` double-pads pageSheets and floats the strip
 * above the NativeTabs plane the user expects.
 */
export const ORDER_DETAIL_ACTION_TAB_MARGIN_BOTTOM = spacing[1];

type TabIcon = ComponentType<IconProps>;

type OrderDetailActionTabProps = {
  label: string;
  icon: TabIcon;
  onPress: () => void;
  /** Selected-tab tint (primary status CTA). */
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  /**
   * Stable identity for content crossfade (e.g. work-order status).
   * When this changes, icon + label animate in/out like a tab switch.
   */
  contentKey?: string;
};

/**
 * Tab-like footer action — icon above, caption below, no filled chrome.
 * Mirrors NativeTabs visual weight on the WO detail sheet.
 */
export function OrderDetailActionTab({
  label,
  icon: Icon,
  onPress,
  active = false,
  disabled = false,
  loading = false,
  accessibilityLabel,
  contentKey,
}: OrderDetailActionTabProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const tint = active ? colors.primary : colors.foreground;
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const identity = contentKey ?? label;

  useEffect(() => {
    if (!loading || !active || reducedMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withTiming(0.72, { duration: 520, easing: autocoreEase }, () => {
      pulse.value = withTiming(1, { duration: 520, easing: autocoreEase });
    });
  }, [active, loading, pulse, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    // Pop when Call / Parts wait / Complete swaps under the same slot.
    scale.value = withSpring(0.92, spring.press);
    scale.value = withSpring(1, spring.settle);
  }, [identity, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: active && loading ? pulse.value : 1,
  }));

  const iconEnter = reducedMotion
    ? undefined
    : ZoomIn.duration(duration.fast)
        .easing(autocoreEase)
        .withInitialValues({ opacity: 0, transform: [{ scale: 0.72 }] });
  const iconExit = reducedMotion
    ? undefined
    : ZoomOut.duration(duration.instant).easing(autocoreEase);
  const labelEnter = reducedMotion
    ? undefined
    : FadeInDown.duration(duration.fast)
        .easing(autocoreEase)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] });
  const labelExit = reducedMotion
    ? undefined
    : FadeOutUp.duration(duration.instant).easing(autocoreEase);

  return (
    <Animated.View
      layout={
        reducedMotion
          ? undefined
          : LinearTransition.springify()
              .damping(spring.list.damping)
              .stiffness(spring.list.stiffness)
              .mass(spring.list.mass)
      }
      style={{ flex: 1, minWidth: 0 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        hitSlop={{ top: 4, bottom: 4 }}
        onPressIn={() => {
          if (isDisabled || reducedMotion) return;
          scale.value = withSpring(0.94, spring.press);
        }}
        onPressOut={() => {
          if (reducedMotion) return;
          scale.value = withSpring(1, spring.settle);
        }}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
      >
        {({ pressed }) => (
          <Animated.View
            style={[
              animatedStyle,
              {
                minHeight: ORDER_DETAIL_ACTION_TAB_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                opacity: isDisabled && !loading ? 0.4 : pressed ? 0.55 : 1,
              },
            ]}
          >
            {loading ? (
              <Animated.View key="loading" entering={iconEnter} exiting={iconExit}>
                <ActivityIndicator size="small" color={tint} />
              </Animated.View>
            ) : (
              <Animated.View
                key={`icon-${identity}`}
                entering={iconEnter}
                exiting={iconExit}
              >
                <Icon size="md" color={tint} strokeWidth={active ? 2 : 1.75} />
              </Animated.View>
            )}
            <Animated.View
              key={`label-${identity}`}
              entering={labelEnter}
              exiting={labelExit}
            >
              <Text
                variant="caption"
                numberOfLines={1}
                style={{ ...TAB_LABEL_STYLE, color: tint }}
              >
                {label}
              </Text>
            </Animated.View>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

type OrderDetailActionStripProps = {
  children: ReactNode;
};

/**
 * Floating capsule for WO footer actions — same visual plane as NativeTabs
 * so the strip reads as a container, not as part of the order cards above.
 */
export function OrderDetailActionStrip({ children }: OrderDetailActionStripProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      layout={
        reducedMotion
          ? undefined
          : LinearTransition.springify()
              .damping(spring.list.damping)
              .stiffness(spring.list.stiffness)
              .mass(spring.list.mass)
      }
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
        minHeight: ORDER_DETAIL_ACTION_TAB_HEIGHT,
        borderRadius: tokens.radius.full,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.secondary,
        overflow: 'hidden',
        paddingHorizontal: spacing[1],
      }}
    >
      {children}
    </Animated.View>
  );
}
