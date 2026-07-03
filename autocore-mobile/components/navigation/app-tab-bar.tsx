import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LayoutGridIcon } from '@/assets/icons';
import { useNavigationConfigStore } from '@/features/settings/store/navigation-config-store';
import {
  getNavItemHref,
  getNavVisual,
  resolveTabBarEntries,
} from '@/features/settings/lib/tab-bar-integration';
import type { NavItemId } from '@/features/settings/types';
import { useReducedMotion, useTheme, useCompanyModuleEnabled } from '@/hooks';
import { Text } from '@/components/ui';
import { autocoreEase, spring } from '@/theme/motion';
import { haptics, spacing } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { resolveTabRouteName, useTabTransition } from './tab-transition-context';

type TabVisual = {
  label: string;
  icon: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  emphasized?: boolean;
};

const TAB_PATHS: Record<string, '/(tabs)' | '/(tabs)/search' | '/(tabs)/scan' | '/(tabs)/orders' | '/(tabs)/accounting' | '/(tabs)/profile'> = {
  index: '/(tabs)',
  search: '/(tabs)/search',
  scan: '/(tabs)/scan',
  orders: '/(tabs)/orders',
  accounting: '/(tabs)/accounting',
  profile: '/(tabs)/profile',
};

type TabRoute = { key: string; name: string; params?: object };

type AppTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => unknown;
    navigate: (name: string, params?: object) => void;
  };
};

function AppTabBarItem({
  label,
  Icon,
  active,
  emphasized = false,
  color,
  mutedColor,
  onPress,
  onLongPress,
}: {
  label: string;
  Icon: TabVisual['icon'];
  active: boolean;
  emphasized?: boolean;
  color: string;
  mutedColor: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);
  const pressed = useSharedValue(1);
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = active ? 1 : 0;
      return;
    }
    progress.value = withSpring(active ? 1 : 0, { damping: 22, stiffness: 220, mass: 0.75 });
  }, [active, progress, reducedMotion]);

  useEffect(() => {
    if (!emphasized || reducedMotion) return;
    breathe.value = withDelay(
      2000,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1800, easing: autocoreEase }),
          withTiming(1, { duration: 1800, easing: autocoreEase }),
          withTiming(1, { duration: 2600 }),
        ),
        -1,
        false,
      ),
    );
  }, [breathe, emphasized, reducedMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, emphasized ? -1.5 : -1]) },
      {
        scale:
          pressed.value *
          (emphasized && !active ? breathe.value : 1) *
          interpolate(progress.value, [0, 1], [0.95, 1]),
      },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.72, 1]),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (reducedMotion) return;
        pressed.value = withTiming(0.97, { duration: 120, easing: autocoreEase });
      }}
      onPressOut={() => {
        pressed.value = withSpring(1, spring.snappy);
      }}
      style={{ flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: spacing[1], borderRadius: 18 }}
    >
      <Animated.View style={iconStyle}>
        <Icon size={emphasized ? 'lg' : 'md'} color={active ? color : mutedColor} strokeWidth={active ? (emphasized ? 2.5 : 2.4) : emphasized ? 2 : 1.8} />
      </Animated.View>
      <Animated.View style={labelStyle}>
        <Text variant="caption" style={{ color: active ? color : mutedColor, fontWeight: active ? '600' : '500', fontSize: 11, lineHeight: 14 }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function isNavItemModuleEnabled(
  id: NavItemId,
  workOrders: boolean,
  warehouse: boolean,
  accounting: boolean,
): boolean {
  if (id === 'orders') return workOrders;
  if (id === 'search' || id === 'scan') return warehouse;
  if (id === 'accounting') return accounting;
  return true;
}

export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const { colors, isDark, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const segments = useSegments();
  const hideTabBar =
    segments[0] === '(tabs)' &&
    ((segments[1] === 'orders' && segments.length > 2) || (segments[1] === 'profile' && segments.length > 2));
  const workOrdersEnabled = useCompanyModuleEnabled('workOrders');
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const accountingModuleEnabled = useCompanyModuleEnabled('accounting');
  const navOrder = useNavigationConfigStore((s) => s.order);
  const navEnabled = useNavigationConfigStore((s) => s.enabled);
  const { beginTransition } = useTabTransition();
  const [containerWidth, setContainerWidth] = useState(0);
  const capsuleX = useSharedValue(0);
  const barY = useSharedValue(reducedMotion ? 0 : 28);
  const barOpacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      barY.value = 0;
      barOpacity.value = 1;
      return;
    }
    barOpacity.value = withDelay(180, withTiming(1, { duration: 380, easing: autocoreEase }));
    barY.value = withDelay(180, withSpring(0, spring.gentle));
  }, [barOpacity, barY, reducedMotion]);

  const tabEntries = useMemo(() => {
    return resolveTabBarEntries(navOrder, navEnabled).filter((entry) => {
      if (entry.kind === 'more') return entry.items.length > 0;
      return isNavItemModuleEnabled(entry.navId, workOrdersEnabled, warehouseEnabled, accountingModuleEnabled);
    });
  }, [navOrder, navEnabled, workOrdersEnabled, warehouseEnabled, accountingModuleEnabled]);

  const horizontalPadding = spacing[6];
  const itemWidth = tabEntries.length > 0 ? Math.max((containerWidth - horizontalPadding * 2) / tabEntries.length, 0) : 0;
  const capsuleWidth = Math.max(itemWidth - spacing[1], 0);
  const activeRouteKey = state.routes[state.index]?.key;
  const activeRouteName = state.routes[state.index]?.name;

  const activeVisibleIndex = useMemo(() => {
    return tabEntries.findIndex((entry) => {
      if (entry.kind === 'more') return false;
      const route = state.routes.find((r) => r.name === entry.expoName);
      return route?.key === activeRouteKey;
    });
  }, [activeRouteKey, state.routes, tabEntries]);

  useEffect(() => {
    if (!itemWidth || activeVisibleIndex < 0) return;
    const nextX = activeVisibleIndex * itemWidth + (itemWidth - capsuleWidth) / 2;
    if (reducedMotion) {
      capsuleX.value = nextX;
      return;
    }
    capsuleX.value = withSpring(nextX, { damping: 22, stiffness: 220, mass: 0.75 });
  }, [activeVisibleIndex, capsuleWidth, capsuleX, itemWidth, reducedMotion]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: capsuleX.value }],
    opacity: itemWidth ? 1 : 0,
  }));

  const barEnterStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
    transform: [{ translateY: barY.value }],
  }));

  const openMore = (items: NavItemId[]) => {
    const options = items
      .filter((id) => isNavItemModuleEnabled(id, workOrdersEnabled, warehouseEnabled, accountingModuleEnabled))
      .map((id) => ({
        text: getNavVisual(id).label,
        onPress: () => {
          const href = getNavItemHref(id);
          if (href) router.push(href);
        },
      }));
    options.push({ text: 'Отмена', onPress: () => {} });
    Alert.alert('Ещё', 'Дополнительные разделы', options, { cancelable: true });
  };

  if (hideTabBar) return null;

  const renderTabs = () => (
    <View style={{ height: 64, justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: spacing[1],
            bottom: spacing[1],
            width: capsuleWidth,
            borderRadius: 22,
            backgroundColor: toneBackground(colors.primary, isDark ? 0.16 : 0.1),
            borderWidth: 1,
            borderColor: toneBackground(colors.primary, 0.22),
          },
          capsuleStyle,
        ]}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {tabEntries.map((entry) => {
          if (entry.kind === 'more') {
            return (
              <View key="more" style={{ width: itemWidth }}>
                <AppTabBarItem
                  label={`Ещё${entry.items.length > 1 ? ` (${entry.items.length})` : ''}`}
                  Icon={LayoutGridIcon}
                  active={false}
                  color={colors.primary}
                  mutedColor={colors.mutedForeground}
                  onPress={() => {
                    haptics.selection();
                    openMore(entry.items);
                  }}
                  onLongPress={() => {}}
                />
              </View>
            );
          }

          const visual = getNavVisual(entry.navId);
          const route = state.routes.find((r) => r.name === entry.expoName);
          if (!route) return null;
          const focused = route.key === activeRouteKey;

          return (
            <View key={entry.expoName} style={{ width: itemWidth }}>
              <AppTabBarItem
                label={visual.label}
                Icon={visual.icon}
                active={focused}
                emphasized={visual.emphasized}
                color={colors.primary}
                mutedColor={colors.mutedForeground}
                onPress={() => {
                  haptics.selection();
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  }) as { defaultPrevented?: boolean } | undefined;
                  if (focused) return;
                  if (!event?.defaultPrevented) {
                    const fromTab = resolveTabRouteName(activeRouteName);
                    const toTab = resolveTabRouteName(route.name);
                    if (fromTab && toTab) beginTransition(fromTab, toTab);
                    const nextPath = TAB_PATHS[route.name];
                    if (nextPath) router.navigate(nextPath);
                  }
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing[3], paddingBottom: Math.max(insets.bottom, spacing[2]) }, barEnterStyle]}
    >
      <View
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.glass, ...shadows.sm }}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={isDark ? 28 : 40} tint={isDark ? 'dark' : 'light'} style={{ paddingHorizontal: horizontalPadding, paddingVertical: spacing[2], backgroundColor: colors.glass }}>
            {renderTabs()}
          </BlurView>
        ) : (
          <View style={{ paddingHorizontal: horizontalPadding, paddingVertical: spacing[2], backgroundColor: colors.glass }}>
            {renderTabs()}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
