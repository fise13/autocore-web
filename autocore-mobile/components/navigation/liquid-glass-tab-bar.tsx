import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useCompanyModuleEnabled, useReducedMotion, useTheme } from '@/hooks';
import { useDesignLanguage } from '@/hooks/use-design-language';
import { useSession } from '@/hooks/use-session';
import { isNavItemVisible } from '@/lib/navigation/nav-item-availability';
import { tabNavigationGuard } from '@/lib/navigation/navigation-guard';
import { isNestedTabStackActive } from '@/lib/navigation/should-hide-tab-bar';
import { TAB_SPECS, type TabSpec } from '@/lib/navigation/tab-specs';
import { haptics } from '@/theme';
import {
  getGlassPalette,
  glassHairline,
  glassMotion,
  glassNav,
  supportsLiquidGlass,
} from '@/theme/glass';
import { autocoreEase } from '@/theme/motion';

import { GlassSurface } from './glass-surface';
import { useAiGlassProgress } from './ai-glass-progress';
import { resolveTabRouteName, useTabTransition } from './tab-transition-context';

type TabRoute = {
  key: string;
  name: string;
  state?: { index?: number; routes?: TabRoute[] };
};

export type LiquidGlassTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: {
      type: 'tabPress' | 'tabLongPress';
      target: string;
      canPreventDefault?: boolean;
    }) => unknown;
    navigate: (name: string, params?: object) => void;
  };
};

type BarTab = { spec: TabSpec; route: TabRoute };

const TabSlot = memo(function TabSlot({
  spec,
  active,
  width,
  labelSize,
  onPress,
  onLongPress,
}: {
  spec: TabSpec;
  active: boolean;
  width: number;
  labelSize: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { scheme } = useTheme();
  const dl = useDesignLanguage();
  const reducedMotion = useReducedMotion();
  const palette = getGlassPalette(scheme);
  const press = useSharedValue(0);
  const focus = useSharedValue(active ? 1 : 0);
  const Fallback = spec.icon;

  useEffect(() => {
    focus.value = reducedMotion
      ? active
        ? 1
        : 0
      : withTiming(active ? 1 : 0, { duration: glassMotion.stateMs, easing: autocoreEase });
  }, [active, focus, reducedMotion]);

  // Press compresses the whole slot — the glass gives a little, then returns.
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.975]) }],
  }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: focus.value }));
  const idleIconStyle = useAnimatedStyle(() => ({ opacity: 1 - focus.value }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], [palette.labelInactive, palette.labelActive]),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={spec.label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (reducedMotion) return;
        press.value = withSpring(1, glassMotion.press);
      }}
      onPressOut={() => {
        press.value = withSpring(0, glassMotion.press);
      }}
      style={{
        width,
        height: glassNav.slotMinTouch,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[{ alignItems: 'center', gap: glassNav.iconLabelGap }, contentStyle]}
      >
        <View style={{ width: glassNav.iconSize, height: glassNav.iconSize }}>
          <Animated.View style={[StyleSheet.absoluteFill, idleIconStyle]}>
            <SymbolView
              name={spec.sf.default}
              size={glassNav.iconSize}
              weight="medium"
              tintColor={palette.iconInactive}
              resizeMode="scaleAspectFit"
              fallback={
                <Fallback size={glassNav.iconSize} color={palette.iconInactive} strokeWidth={1.8} />
              }
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, activeIconStyle]}>
            <SymbolView
              name={spec.sf.selected}
              size={glassNav.iconSize}
              weight="semibold"
              tintColor={palette.iconActive}
              resizeMode="scaleAspectFit"
              fallback={
                <Fallback size={glassNav.iconSize} color={palette.iconActive} strokeWidth={2} />
              }
            />
          </Animated.View>
        </View>
        <Animated.Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[
            {
              fontFamily: dl.typeFamily.sans,
              fontSize: labelSize,
              lineHeight: labelSize + 2,
              fontWeight: '600',
              letterSpacing: -0.08,
            },
            labelStyle,
          ]}
        >
          {spec.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
});

/**
 * The floating navigation: one piece of Liquid Glass holding four slots, with a
 * second, brighter piece travelling between them.
 *
 * Everything that moves lives on the UI thread — the capsule rides shared values
 * and the icons cross-fade in place — so a tab switch never re-lays out the bar;
 * only the four `active` booleans change.
 */
export const LiquidGlassTabBar = memo(function LiquidGlassTabBar({
  state,
  navigation,
}: LiquidGlassTabBarProps) {
  const { scheme } = useTheme();
  const { profile } = useSession();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const { beginTransition } = useTabTransition();
  const aiProgress = useAiGlassProgress();
  const workOrders = useCompanyModuleEnabled('workOrders');
  const warehouse = useCompanyModuleEnabled('warehouse');
  const accounting = useCompanyModuleEnabled('accounting');

  const [barWidth, setBarWidth] = useState(0);
  const palette = getGlassPalette(scheme);
  const capsuleX = useSharedValue(0);
  const travel = useSharedValue(0);
  const presence = useSharedValue(0);
  const positioned = useRef(false);

  const tabs = useMemo<BarTab[]>(() => {
    const modules = { workOrders, warehouse, accounting };
    return TAB_SPECS.flatMap((spec) => {
      if (!spec.inBar || spec.navId === null) return [];
      if (!isNavItemVisible(spec.navId, profile, modules)) return [];
      const route = state.routes.find((candidate) => candidate.name === spec.route);
      return route ? [{ spec, route }] : [];
    });
  }, [accounting, profile, state.routes, warehouse, workOrders]);

  const activeKey = state.routes[state.index]?.key;
  const activeName = state.routes[state.index]?.name;
  const activeIndex = tabs.findIndex((tab) => tab.route.key === activeKey);

  const slotWidth = tabs.length ? (barWidth - glassNav.barPadX * 2) / tabs.length : 0;
  const capsuleWidth = Math.max(slotWidth - glassNav.capsuleInsetX * 2, 0);
  const labelSize =
    slotWidth > 0 && slotWidth < glassNav.compactSlotWidth
      ? glassNav.labelSizeCompact
      : glassNav.labelSize;

  useEffect(() => {
    tabNavigationGuard.release();
  }, [state.index, activeKey]);

  useEffect(() => {
    if (!slotWidth || activeIndex < 0) return;
    const next = glassNav.barPadX + activeIndex * slotWidth + glassNav.capsuleInsetX;

    if (reducedMotion || !positioned.current) {
      capsuleX.value = next;
      positioned.current = true;
      return;
    }

    // One object crossing the bar: it stretches into the move and settles square.
    travel.value = withSequence(
      withTiming(1, { duration: glassMotion.travelInMs, easing: autocoreEase }),
      withSpring(0, glassMotion.capsule),
    );
    capsuleX.value = withSpring(next, glassMotion.capsule);
  }, [activeIndex, capsuleX, reducedMotion, slotWidth, travel]);

  // `scan` is reachable inside the tab group but holds no slot, so the capsule
  // has nowhere to be — it fades out rather than parking under the wrong tab.
  useEffect(() => {
    const visible = capsuleWidth > 0 && activeIndex >= 0;
    presence.value = reducedMotion
      ? visible
        ? 1
        : 0
      : withTiming(visible ? 1 : 0, { duration: glassMotion.stateMs, easing: autocoreEase });
  }, [activeIndex, capsuleWidth, presence, reducedMotion]);

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [
      { translateX: capsuleX.value },
      { scaleX: 1 + travel.value * 0.05 },
      { scaleY: 1 - travel.value * 0.035 },
    ],
  }));

  // While the AI composer is open the bar stays put but drops back a plane. The
  // composer's own scrim already darkens it, so this only has to take the edge
  // off — dim it any further and the bar reads as gone rather than behind.
  const shellStyle = useAnimatedStyle(() => ({
    opacity: interpolate(aiProgress.value, [0, 1], [1, 0.72]),
    transform: [{ scale: interpolate(aiProgress.value, [0, 1], [1, 0.985]) }],
  }));

  const handlePress = useCallback(
    (tab: BarTab) => {
      const focused = tab.route.key === activeKey;

      if (tabNavigationGuard.isLocked) return;

      if (focused) {
        // Second tap on the active tab pops its stack back to root.
        if (isNestedTabStackActive(state.routes, state.index)) {
          tabNavigationGuard.tryNavigate(() => {
            router.navigate(`/(tabs)/${tab.route.name}` as never);
          });
        }
        return;
      }

      haptics.selection();
      const event = navigation.emit({
        type: 'tabPress',
        target: tab.route.key,
        canPreventDefault: true,
      }) as { defaultPrevented?: boolean } | undefined;
      if (event?.defaultPrevented) return;

      tabNavigationGuard.tryNavigate(() => {
        navigation.navigate(tab.route.name);
        const from = resolveTabRouteName(activeName ?? '');
        const to = resolveTabRouteName(tab.route.name);
        if (from && to) beginTransition(from, to);
      });
    },
    [activeKey, activeName, beginTransition, navigation, router, state.index, state.routes],
  );

  const handlers = useMemo(
    () =>
      new Map(
        tabs.map((tab) => [
          tab.route.key,
          {
            press: () => handlePress(tab),
            longPress: () => navigation.emit({ type: 'tabLongPress', target: tab.route.key }),
          },
        ]),
      ),
    [handlePress, navigation, tabs],
  );

  if (tabs.length === 0) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: glassNav.barMarginX,
          right: glassNav.barMarginX,
          bottom: Math.max(insets.bottom, glassNav.barBottomGap) + glassNav.barBottomGap,
          height: glassNav.barHeight,
          borderRadius: glassNav.barRadius,
          ...palette.shadow,
        },
        shellStyle,
      ]}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
    >
      <GlassSurface radius={glassNav.barRadius} style={StyleSheet.absoluteFill}>
        {/* The travelling capsule — a second glass object inside the first. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: (glassNav.barHeight - glassNav.capsuleHeight) / 2,
              width: capsuleWidth,
              height: glassNav.capsuleHeight,
              borderRadius: glassNav.capsuleRadius,
              backgroundColor: palette.capsule.fill,
              borderWidth: glassHairline,
              borderColor: palette.capsule.edge,
              overflow: 'hidden',
            },
            capsuleStyle,
          ]}
        >
          <LinearGradient
            colors={palette.capsule.highlight}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: supportsLiquidGlass() ? 0.7 : 1 }]}
          />
        </Animated.View>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: glassNav.barPadX,
          }}
        >
          {tabs.map((tab) => (
            <TabSlot
              key={tab.route.key}
              spec={tab.spec}
              active={tab.route.key === activeKey}
              width={slotWidth}
              labelSize={labelSize}
              onPress={handlers.get(tab.route.key)?.press ?? (() => {})}
              onLongPress={handlers.get(tab.route.key)?.longPress ?? (() => {})}
            />
          ))}
        </View>
      </GlassSurface>
    </Animated.View>
  );
});
