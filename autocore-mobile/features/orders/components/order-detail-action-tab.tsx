import type { ComponentType, ReactNode } from 'react';
import { useEffect } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ZoomIn,
  ZoomOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconProps } from '@/assets/icons/create-icon';
import { LiquidGlassSurface } from '@/components/navigation/liquid-glass-surface';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/use-accessibility';
import {
  DOCK_BAR_WIDTH,
  DOCK_BOTTOM_GAP,
  DOCK_CORNER_RADIUS,
  DOCK_HORIZONTAL_INSET,
  DOCK_ICON_SIZE,
  DOCK_INK,
  DOCK_ITEM_WIDTH,
  DOCK_LABEL_SIZE,
  DOCK_MUTED_ALPHA,
  DOCK_VISUAL_HEIGHT,
} from '@/lib/navigation/floating-tab-bar-inset';
import { autocoreEase, duration, haptics, spring } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Matches LiquidGlassTabBar focus crossfade. */
const FOCUS_DURATION = 200;

type TabIcon = ComponentType<IconProps>;

type OrderDetailActionTabProps = {
  label: string;
  icon: TabIcon;
  onPress: () => void;
  /** Selected-tab weight (primary status CTA) — full ink instead of muted. */
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
 * Dock item — identical metrics to LiquidGlassTabBar's DockItem: 71pt slot,
 * 22pt glyph, 12pt caption, muted at 0.55 and full ink when selected.
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
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const focus = useSharedValue(active ? 1 : 0);
  const identity = contentKey ?? label;

  useEffect(() => {
    const target = active ? 1 : 0;
    focus.value = reducedMotion
      ? target
      : withTiming(target, { duration: FOCUS_DURATION, easing: autocoreEase });
  }, [active, focus, reducedMotion]);

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

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => {
    const focused = interpolate(focus.value, [0, 1], [DOCK_MUTED_ALPHA, 1]);
    return {
      opacity: isDisabled && !loading ? 0.35 : focused * (active && loading ? pulse.value : 1),
    };
  });

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
      style={{ width: DOCK_ITEM_WIDTH, height: DOCK_VISUAL_HEIGHT }}
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading, selected: active }}
        disabled={isDisabled}
        hitSlop={6}
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
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressStyle,
        ]}
      >
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, contentStyle]}>
          <View
            style={{
              width: DOCK_ICON_SIZE,
              height: DOCK_ICON_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <Animated.View key="loading" entering={iconEnter} exiting={iconExit}>
                <ActivityIndicator size="small" color={DOCK_INK} />
              </Animated.View>
            ) : (
              <Animated.View key={`icon-${identity}`} entering={iconEnter} exiting={iconExit}>
                <Icon size={DOCK_ICON_SIZE} color={DOCK_INK} strokeWidth={active ? 2 : 1.75} />
              </Animated.View>
            )}
          </View>

          <Animated.View key={`label-${identity}`} entering={labelEnter} exiting={labelExit}>
            <Text
              variant="caption2"
              numberOfLines={1}
              style={{
                marginTop: 3,
                fontWeight: active ? '600' : '500',
                color: DOCK_INK,
                fontSize: DOCK_LABEL_SIZE,
                lineHeight: 14,
                letterSpacing: 0.1,
              }}
            >
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </AnimatedPressable>
    </Animated.View>
  );
}

type OrderDetailActionDockProps = {
  children: ReactNode;
};

/**
 * WO footer dock — same plane as LiquidGlassTabBar: absolute bottom, centred
 * 356pt stadium, safe-area + 8pt gap, one UIGlassEffect surface (dark chrome
 * fallback pre-iOS 26). Positioning intentionally mirrors the tab bar so the
 * strip reads as the shell's tab row, not as a card action bar.
 */
export function OrderDetailActionDock({ children }: OrderDetailActionDockProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const barWidth = Math.min(
    DOCK_BAR_WIDTH,
    Math.max(280, windowWidth - DOCK_HORIZONTAL_INSET * 2),
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        elevation: 1000,
        alignItems: 'center',
        paddingHorizontal: DOCK_HORIZONTAL_INSET,
        paddingBottom: insets.bottom + DOCK_BOTTOM_GAP,
      }}
    >
      <LiquidGlassSurface
        radius={DOCK_CORNER_RADIUS}
        isInteractive
        containerStyle={{
          width: barWidth,
          height: DOCK_VISUAL_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 24,
          elevation: 8,
        }}
        style={{
          width: barWidth,
          height: DOCK_VISUAL_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
        }}
      >
        {children}
      </LiquidGlassSurface>
    </View>
  );
}
