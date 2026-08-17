import { memo, useCallback, useEffect, useMemo } from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import {
  DOCK_ACTION_FILL,
  DOCK_ACTION_FILL_DARK,
  DOCK_ACTION_HIT_SIZE,
  DOCK_ACTION_ICON_SIZE,
  DOCK_ACTION_ICON_STROKE,
  DOCK_ACTION_INK,
  DOCK_ACTION_INK_DARK,
  DOCK_ACTION_RADIUS,
  DOCK_ACTION_SIZE,
  DOCK_BAR_WIDTH,
  DOCK_BORDER,
  DOCK_BORDER_WIDTH,
  DOCK_BOTTOM_GAP,
  DOCK_CORNER_RADIUS,
  DOCK_FILL,
  DOCK_HORIZONTAL_INSET,
  DOCK_ICON_SIZE,
  DOCK_INK,
  DOCK_ITEM_WIDTH,
  DOCK_LABEL_SIZE,
  DOCK_MUTED_ALPHA,
  DOCK_VISUAL_HEIGHT,
} from '@/lib/navigation/floating-tab-bar-inset';
import { canUseLiquidGlass, LIQUID_GLASS_TINT } from '@/lib/navigation/liquid-glass';
import { TAB_SPECS, type TabSpec } from '@/lib/navigation/tab-specs';
import { useActionSheetStore } from '@/lib/shell/action-sheet-store';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import {
  resolveTabRouteName,
  useTabTransition,
} from './tab-transition-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FOCUS_DURATION = 200;

/** SwiftUI Spring(response: 0.32, dampingFraction: 0.8) → Reanimated. */
const PLUS_TO_X_SPRING = {
  mass: 1,
  stiffness: (2 * Math.PI / 0.32) ** 2,
  damping: (4 * Math.PI * 0.8) / 0.32,
} as const;

function PlusMark({ color }: { color: string }) {
  const arm = DOCK_ACTION_ICON_STROKE;
  const span = DOCK_ACTION_ICON_SIZE;
  return (
    <View style={styles.plusBox} accessibilityElementsHidden>
      <View
        style={[
          styles.plusArm,
          {
            width: span,
            height: arm,
            borderRadius: arm / 2,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.plusArm,
          {
            width: arm,
            height: span,
            borderRadius: arm / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

function DockItem({
  label,
  sf,
  selectedSf,
  focused,
  onPress,
  onLongPress,
  ink,
}: {
  label: string;
  sf: string;
  selectedSf: string;
  focused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  ink: string;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    const target = focused ? 1 : 0;
    focus.value = reducedMotion
      ? target
      : withTiming(target, { duration: FOCUS_DURATION, easing: Easing.out(Easing.cubic) });
  }, [focus, focused, reducedMotion]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const restingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [DOCK_MUTED_ALPHA, 0]),
  }));
  const selectedStyle = useAnimatedStyle(() => ({ opacity: focus.value }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [DOCK_MUTED_ALPHA, 1]),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, tokens.motion.springs.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, tokens.motion.springs.press);
      }}
      style={[styles.item, pressStyle]}
      hitSlop={6}
    >
      <View style={styles.itemContent}>
        <View style={styles.glyphBox}>
          <Animated.View style={[styles.glyphLayer, restingStyle]}>
            <SymbolView
              name={sf as 'house'}
              size={DOCK_ICON_SIZE}
              tintColor={ink}
              weight="regular"
            />
          </Animated.View>
          <Animated.View style={[styles.glyphLayer, selectedStyle]}>
            <SymbolView
              name={selectedSf as 'house'}
              size={DOCK_ICON_SIZE}
              tintColor={ink}
              weight="medium"
            />
          </Animated.View>
        </View>

        <Animated.View style={labelStyle}>
          <Text
            variant="caption2"
            style={{
              marginTop: 3,
              fontWeight: focused ? '600' : '500',
              color: ink,
              fontSize: DOCK_LABEL_SIZE,
              lineHeight: 14,
              letterSpacing: 0.1,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
}

function CenterAction({ onPress }: { onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const { isDark } = useTheme();
  const open = useActionSheetStore((s) => s.open);
  const rotation = useSharedValue(open ? 45 : 0);
  const scale = useSharedValue(1);
  const fill = isDark ? DOCK_ACTION_FILL_DARK : DOCK_ACTION_FILL;
  const ink = isDark ? DOCK_ACTION_INK_DARK : DOCK_ACTION_INK;

  useEffect(() => {
    if (reducedMotion) {
      rotation.value = open ? 45 : 0;
      scale.value = 1;
      return;
    }
    rotation.value = withSpring(open ? 45 : 0, PLUS_TO_X_SPRING);
    if (open) {
      scale.value = withSequence(
        withTiming(1.06, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withSpring(1, PLUS_TO_X_SPRING),
      );
    } else {
      scale.value = withSequence(
        withTiming(0.96, { duration: 80, easing: Easing.out(Easing.cubic) }),
        withSpring(1, PLUS_TO_X_SPRING),
      );
    }
  }, [open, reducedMotion, rotation, scale]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  return (
    <View style={styles.actionSlot}>
      <RNPressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close' : 'New'}
        accessibilityHint={open ? 'Closes the add menu' : 'Opens things you can add'}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        style={styles.actionHit}
        hitSlop={8}
      >
        <View
          style={[
            styles.actionOrbSolid,
            {
              backgroundColor: fill,
              borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <Animated.View style={markStyle}>
            <PlusMark color={ink} />
          </Animated.View>
        </View>
      </RNPressable>
    </View>
  );
}

/** Pre-iOS 26 / Android — dense dark stadium (no faux Vision-Pro glass). */
function FallbackChrome() {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: DOCK_CORNER_RADIUS,
          overflow: 'hidden',
          backgroundColor: DOCK_FILL,
          borderWidth: DOCK_BORDER_WIDTH,
          borderColor: DOCK_BORDER,
        },
      ]}
    />
  );
}

function LiquidGlassTabBarInner({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const liquid = useMemo(() => canUseLiquidGlass(), []);
  const { beginTransition } = useTabTransition();

  const navSpecs = useMemo(() => TAB_SPECS.filter((spec) => !spec.isAction), []);
  const actionSpec = useMemo(() => TAB_SPECS.find((spec) => spec.isAction), []);
  const present = useActionSheetStore((s) => s.present);
  const dismiss = useActionSheetStore((s) => s.dismiss);
  const presentAction = useCallback(() => {
    if (useActionSheetStore.getState().open) dismiss();
    else present();
  }, [dismiss, present]);

  const barWidth = Math.min(
    DOCK_BAR_WIDTH,
    Math.max(280, windowWidth - DOCK_HORIZONTAL_INSET * 2),
  );

  const onTabPress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      const fromName = state.routes[state.index]?.name ?? 'index';
      const fromTab = resolveTabRouteName(fromName);
      const toTab = resolveTabRouteName(routeName);
      if (fromTab && toTab && fromTab !== toTab) {
        beginTransition(fromTab, toTab);
      }

      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    },
    [beginTransition, navigation, state.index, state.routes],
  );

  const renderTab = (spec: TabSpec) => {
    const routeIndex = state.routes.findIndex((r) => r.name === spec.route);
    if (routeIndex < 0) return null;
    const route = state.routes[routeIndex];
    const focused = state.index === routeIndex;

    return (
      <DockItem
        key={spec.route}
        label={spec.label}
        sf={spec.sf.default}
        selectedSf={spec.sf.selected}
        focused={focused}
        ink={DOCK_INK}
        onPress={() => onTabPress(route.key, route.name, focused)}
        onLongPress={() => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        }}
      />
    );
  };

  const bottomPad = insets.bottom + DOCK_BOTTOM_GAP;
  const slots = (
    <>
      {navSpecs.slice(0, 2).map(renderTab)}
      {actionSpec ? (
        <CenterAction key={actionSpec.route} onPress={presentAction} />
      ) : null}
      {navSpecs.slice(2).map(renderTab)}
    </>
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
      {liquid ? (
        /**
         * One continuous UIGlassEffect stadium — white solid create orb inside.
         */
        <GlassContainer
          spacing={0}
          style={[
            styles.glassContainer,
            {
              width: barWidth,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
            },
          ]}
        >
          <GlassView
            style={[styles.unifiedBar, { width: barWidth }]}
            glassEffectStyle="regular"
            colorScheme="dark"
            tintColor={LIQUID_GLASS_TINT}
            isInteractive
          >
            {slots}
          </GlassView>
        </GlassContainer>
      ) : (
        <View
          style={[
            styles.barOuter,
            {
              width: barWidth,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
              elevation: 8,
            },
          ]}
        >
          <FallbackChrome />
          <View style={styles.slots}>{slots}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    paddingHorizontal: DOCK_HORIZONTAL_INSET,
  },
  glassContainer: {
    height: DOCK_VISUAL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedBar: {
    height: DOCK_VISUAL_HEIGHT,
    borderRadius: DOCK_CORNER_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  barOuter: {
    height: DOCK_VISUAL_HEIGHT,
    borderRadius: DOCK_CORNER_RADIUS,
  },
  slots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    zIndex: 3,
  },
  item: {
    width: DOCK_ITEM_WIDTH,
    height: DOCK_VISUAL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBox: {
    width: DOCK_ICON_SIZE,
    height: DOCK_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSlot: {
    width: DOCK_ITEM_WIDTH,
    height: DOCK_VISUAL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  actionHit: {
    width: DOCK_ACTION_HIT_SIZE,
    height: DOCK_ACTION_HIT_SIZE,
    borderRadius: DOCK_ACTION_HIT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOrbSolid: {
    width: DOCK_ACTION_SIZE,
    height: DOCK_ACTION_SIZE,
    borderRadius: DOCK_ACTION_RADIUS,
    backgroundColor: DOCK_ACTION_FILL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  plusBox: {
    width: DOCK_ACTION_ICON_SIZE,
    height: DOCK_ACTION_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusArm: {
    position: 'absolute',
  },
});

export const LiquidGlassTabBar = memo(LiquidGlassTabBarInner);
