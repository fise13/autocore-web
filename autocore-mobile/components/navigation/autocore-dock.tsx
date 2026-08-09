import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable as RNPressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
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

import { GlassSheen } from '@/components/navigation/glass-sheen';
import { Text } from '@/components/ui/text';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import {
  DOCK_ACTION_SIZE,
  DOCK_ACTIVE_CAPSULE_HEIGHT,
  DOCK_ACTIVE_CAPSULE_RADIUS,
  DOCK_BORDER_WIDTH,
  DOCK_BOTTOM_GAP,
  DOCK_CORNER_RADIUS,
  DOCK_GAP,
  DOCK_HORIZONTAL_INSET,
  DOCK_ITEM_WIDTH,
  DOCK_PILL_PAD_X,
  DOCK_VISUAL_HEIGHT,
} from '@/lib/navigation/floating-tab-bar-inset';
import { TAB_SPECS } from '@/lib/navigation/tab-specs';
import { presentActionSheet } from '@/lib/shell/present-action-sheet';
import { withAlpha } from '@/theme/color-utils';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import {
  resolveTabRouteName,
  useTabTransition,
} from './tab-transition-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Dock material — blurred backdrop plus the shared liquid-glass specular
 * passes, so the pill, the action orb and the composer all catch light the
 * same way.
 */
function DockGlass({ isDark, radius }: { isDark: boolean; radius: number }) {
  return (
    <>
      <BlurView
        pointerEvents="none"
        intensity={isDark ? 40 : 52}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      <GlassSheen isDark={isDark} radius={radius} />
    </>
  );
}

/** Selection crossfade — outline and filled glyphs dissolve into each other. */
const FOCUS_DURATION = 200;

function DockItem({
  label,
  sf,
  selectedSf,
  focused,
  onPress,
  onLongPress,
  ink,
  mutedAlpha,
  onLayout,
}: {
  label: string;
  sf: string;
  selectedSf: string;
  focused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  ink: string;
  /** Resting alpha for unselected glyphs — animated, not swapped. */
  mutedAlpha: number;
  onLayout: (e: LayoutChangeEvent) => void;
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

  // Both glyphs share one ink; only alpha moves, so there is no colour pop.
  const restingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [mutedAlpha, 0]),
  }));
  const selectedStyle = useAnimatedStyle(() => ({ opacity: focus.value }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [mutedAlpha, 1]),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onLayout={onLayout}
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
            <SymbolView name={sf as 'house'} size={18} tintColor={ink} weight="regular" />
          </Animated.View>
          <Animated.View style={[styles.glyphLayer, selectedStyle]}>
            <SymbolView
              name={selectedSf as 'house'}
              size={18}
              tintColor={ink}
              weight="semibold"
            />
          </Animated.View>
        </View>

        <Animated.View style={labelStyle}>
          <Text
            variant="caption2"
            style={{
              marginTop: 1,
              fontWeight: focused ? '600' : '500',
              color: ink,
              fontSize: 10,
              lineHeight: 12,
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

function ActionOrb({
  isDark,
  borderColor,
  fill,
  ink,
  onPress,
}: {
  isDark: boolean;
  borderColor: string;
  fill: string;
  ink: string;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.actionOrbOuter,
        {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 10,
          elevation: 4,
        },
        pressStyle,
      ]}
    >
      {/* RN Pressable — RNGH pressables under absolute tab bars often miss hits. */}
      <RNPressable
        accessibilityRole="button"
        accessibilityLabel="New"
        accessibilityHint="Opens create and capture actions"
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        onPressIn={() => {
          scale.value = reducedMotion
            ? 0.94
            : withSpring(0.94, tokens.motion.springs.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, tokens.motion.springs.settle);
        }}
        style={styles.actionOrbHit}
        hitSlop={12}
      >
        <View
          style={[
            styles.actionOrbInner,
            {
              borderColor,
              backgroundColor: fill,
            },
          ]}
        >
          <DockGlass isDark={isDark} radius={DOCK_ACTION_SIZE / 2} />
          <View pointerEvents="none" style={styles.actionIcon}>
            <SymbolView name="plus" size={22} tintColor={ink} weight="medium" />
          </View>
        </View>
      </RNPressable>
    </Animated.View>
  );
}

function AutocoreDockInner({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const presentAction = useCallback(() => {
    presentActionSheet();
  }, []);
  const { beginTransition } = useTabTransition();

  const navSpecs = useMemo(() => TAB_SPECS.filter((spec) => !spec.isAction), []);

  const ink = isDark ? '#ffffff' : colors.foreground;
  const mutedAlpha = isDark ? 0.55 : 0.42;
  /** Lit glass, not a charcoal tile — the selection should feel like a lens. */
  const capsuleFill = isDark ? 'rgba(255,255,255,0.13)' : withAlpha(colors.foreground, 0.07);
  const capsuleRim = isDark ? 'rgba(255,255,255,0.2)' : withAlpha(colors.foreground, 0.09);
  const glassFill = isDark ? 'rgba(28,28,30,0.7)' : withAlpha('#f2f2f4', 0.82);
  const borderColor = isDark ? 'rgba(255,255,255,0.16)' : withAlpha(colors.foreground, 0.12);

  /** X origins of each dock item inside the pill row. */
  const itemXs = useRef<number[]>(navSpecs.map(() => 0));
  const capsuleX = useSharedValue(0);
  const capsuleOpacity = useSharedValue(0);
  /** Horizontal stretch while travelling — the capsule reads as liquid, not a tile. */
  const capsuleStretch = useSharedValue(1);
  const hasPlacedCapsule = useRef(false);

  const focusedNavIndex = useMemo(() => {
    const focusedRoute = state.routes[state.index]?.name;
    const idx = navSpecs.findIndex((spec) => spec.route === focusedRoute);
    return idx >= 0 ? idx : 0;
  }, [navSpecs, state.index, state.routes]);

  const placeCapsule = useCallback(
    (index: number, animate: boolean) => {
      const x = itemXs.current[index];
      if (x == null || Number.isNaN(x)) return;

      if (!animate || reducedMotion || !hasPlacedCapsule.current) {
        capsuleX.value = x;
        capsuleOpacity.value = 1;
        capsuleStretch.value = 1;
        hasPlacedCapsule.current = true;
        return;
      }

      capsuleX.value = withSpring(x, tokens.motion.springs.nav);
      capsuleOpacity.value = withTiming(1, { duration: tokens.motion.duration.fast });
      capsuleStretch.value = withSequence(
        withTiming(1.14, {
          duration: tokens.motion.duration.instant,
          easing: Easing.out(Easing.quad),
        }),
        withSpring(1, tokens.motion.springs.press),
      );
      hasPlacedCapsule.current = true;
    },
    [capsuleOpacity, capsuleStretch, capsuleX, reducedMotion],
  );

  useEffect(() => {
    placeCapsule(focusedNavIndex, true);
  }, [focusedNavIndex, placeCapsule]);

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: capsuleOpacity.value,
    transform: [{ translateX: capsuleX.value }, { scaleX: capsuleStretch.value }],
  }));

  const onItemLayout = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      itemXs.current[index] = e.nativeEvent.layout.x;
      if (index === focusedNavIndex) {
        placeCapsule(index, false);
      }
    },
    [focusedNavIndex, placeCapsule],
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

  const bottomPad = Math.max(insets.bottom, DOCK_BOTTOM_GAP);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={styles.row}>
        <View
          style={[
            styles.pillOuter,
            {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 12,
              elevation: 4,
            },
          ]}
        >
          <View
            style={[
              styles.pillInner,
              {
                borderColor,
                backgroundColor: glassFill,
              },
            ]}
          >
            <DockGlass isDark={isDark} radius={DOCK_CORNER_RADIUS} />
            <View style={styles.pillItems}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.slidingCapsule,
                  { backgroundColor: capsuleFill, borderColor: capsuleRim },
                  capsuleStyle,
                ]}
              />
              {navSpecs.map((spec, index) => {
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
                    ink={ink}
                    mutedAlpha={mutedAlpha}
                    onLayout={(e) => onItemLayout(index, e)}
                    onPress={() => onTabPress(route.key, route.name, focused)}
                    onLongPress={() => {
                      navigation.emit({ type: 'tabLongPress', target: route.key });
                    }}
                  />
                );
              })}
            </View>
          </View>
        </View>

        <ActionOrb
          isDark={isDark}
          borderColor={borderColor}
          fill={glassFill}
          ink={ink}
          onPress={presentAction}
        />
      </View>
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
    paddingHorizontal: DOCK_HORIZONTAL_INSET,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOCK_GAP,
    zIndex: 1,
  },
  pillOuter: {
    flex: 1,
    height: DOCK_VISUAL_HEIGHT,
    borderRadius: DOCK_CORNER_RADIUS,
  },
  pillInner: {
    flex: 1,
    borderRadius: DOCK_CORNER_RADIUS,
    borderWidth: DOCK_BORDER_WIDTH,
    overflow: 'hidden',
  },
  pillItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: DOCK_PILL_PAD_X,
    zIndex: 3,
  },
  slidingCapsule: {
    position: 'absolute',
    left: 0,
    top: (DOCK_VISUAL_HEIGHT - DOCK_BORDER_WIDTH * 2 - DOCK_ACTIVE_CAPSULE_HEIGHT) / 2,
    width: DOCK_ITEM_WIDTH,
    height: DOCK_ACTIVE_CAPSULE_HEIGHT,
    borderRadius: DOCK_ACTIVE_CAPSULE_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 0,
  },
  item: {
    width: DOCK_ITEM_WIDTH,
    height: DOCK_VISUAL_HEIGHT - DOCK_BORDER_WIDTH * 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  /** Fixed box so the two crossfading glyphs sit exactly on top of each other. */
  glyphBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOrbOuter: {
    width: DOCK_ACTION_SIZE,
    height: DOCK_ACTION_SIZE,
    borderRadius: DOCK_ACTION_SIZE / 2,
    zIndex: 2,
  },
  actionOrbHit: {
    flex: 1,
  },
  actionOrbInner: {
    flex: 1,
    borderRadius: DOCK_ACTION_SIZE / 2,
    borderWidth: DOCK_BORDER_WIDTH,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const AutocoreDock = memo(AutocoreDockInner);
