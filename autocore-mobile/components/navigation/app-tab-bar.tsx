import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
import {
  TAB_BAR_ROW_HEIGHT,
  TAB_BAR_VERTICAL_PADDING,
} from '@/lib/navigation/floating-tab-bar-inset';
import { tabNavigationGuard } from '@/lib/navigation/navigation-guard';
import { isNavItemVisible } from '@/lib/navigation/nav-item-availability';
import {
  isNestedTabStackActive,
  shouldHideTabBarFromNavState,
} from '@/lib/navigation/should-hide-tab-bar';
import { useSession } from '@/hooks/use-session';
import { autocoreEase, duration } from '@/theme/motion';
import { haptics, rhythm, spacing } from '@/theme';

import { resolveTabRouteName, useTabTransition } from './tab-transition-context';

type TabVisual = {
  label: string;
  icon: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
};

const TAB_ICON_STROKE = { active: 2, inactive: 1.75 } as const;
const TAB_MOTION_MS = duration.normal;

type TabRoute = {
  key: string;
  name: string;
  params?: object;
  state?: {
    index?: number;
    routes?: TabRoute[];
  };
};

export type AppTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => unknown;
    navigate: (name: string, params?: object) => void;
  };
};

const AppTabBarItem = memo(function AppTabBarItem({
  label,
  Icon,
  active,
  activeColor,
  inactiveIconColor,
  inactiveLabelColor,
  onPress,
  onLongPress,
}: {
  label: string;
  Icon: TabVisual['icon'];
  active: boolean;
  activeColor: string;
  inactiveIconColor: string;
  inactiveLabelColor: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (reducedMotion) return;
        pressed.value = withTiming(0.96, { duration: duration.fast, easing: autocoreEase });
      }}
      onPressOut={() => {
        pressed.value = withTiming(1, { duration: duration.fast, easing: autocoreEase });
      }}
      style={{
        flex: 1,
        minHeight: TAB_BAR_ROW_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        borderRadius: rhythm.cardRadius,
      }}
    >
      <Animated.View style={iconStyle}>
        <Icon
          size="md"
          color={active ? activeColor : inactiveIconColor}
          strokeWidth={active ? TAB_ICON_STROKE.active : TAB_ICON_STROKE.inactive}
        />
      </Animated.View>
      <Text
        variant="meta"
        numberOfLines={1}
        style={{
          fontSize: 10,
          lineHeight: 12,
          fontWeight: active ? '600' : '500',
          letterSpacing: 0.15,
          color: active ? activeColor : inactiveLabelColor,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export const AppTabBar = memo(function AppTabBar({ state, navigation }: AppTabBarProps) {
  const { colors, isDark, shadows } = useTheme();
  const { profile } = useSession();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const hideTabBar = shouldHideTabBarFromNavState(state.routes, state.index);
  const workOrdersEnabled = useCompanyModuleEnabled('workOrders');
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const accountingModuleEnabled = useCompanyModuleEnabled('accounting');
  const navOrder = useNavigationConfigStore((s) => s.order);
  const navEnabled = useNavigationConfigStore((s) => s.enabled);
  const { beginTransition } = useTabTransition();
  const [containerWidth, setContainerWidth] = useState(0);
  const capsuleX = useSharedValue(0);

  const tabEntries = useMemo(() => {
    const modules = {
      workOrders: workOrdersEnabled,
      warehouse: warehouseEnabled,
      accounting: accountingModuleEnabled,
    };
    return resolveTabBarEntries(navOrder, navEnabled).filter((entry) => {
      if (entry.kind === 'more') {
        return entry.items.some((id) => isNavItemVisible(id, profile, modules));
      }
      return isNavItemVisible(entry.navId, profile, modules);
    });
  }, [navOrder, navEnabled, workOrdersEnabled, warehouseEnabled, accountingModuleEnabled, profile]);

  const horizontalPadding = spacing[4];
  const itemWidth = tabEntries.length > 0 ? Math.max((containerWidth - horizontalPadding * 2) / tabEntries.length, 0) : 0;
  const capsuleWidth = Math.max(itemWidth - spacing[1.5], 0);
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
    tabNavigationGuard.release();
  }, []);

  useEffect(() => {
    tabNavigationGuard.release();
  }, [state.index, activeRouteKey]);

  useEffect(() => {
    if (!itemWidth || activeVisibleIndex < 0) return;
    const nextX = activeVisibleIndex * itemWidth + (itemWidth - capsuleWidth) / 2;
    capsuleX.value = reducedMotion
      ? nextX
      : withTiming(nextX, { duration: TAB_MOTION_MS, easing: autocoreEase });
  }, [activeVisibleIndex, capsuleWidth, capsuleX, itemWidth, reducedMotion]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: capsuleX.value }],
    opacity: itemWidth ? 1 : 0,
  }));

  const inactiveIconColor = colors.mutedForeground;
  const inactiveLabelColor = colors.textSecondary;

  const handleTabPress = useCallback(
    (route: TabRoute, focused: boolean) => {
      if (tabNavigationGuard.isLocked) return;

      if (focused) {
        if (isNestedTabStackActive(state.routes, state.index)) {
          tabNavigationGuard.tryNavigate(() => {
            router.navigate(`/(tabs)/${route.name}` as never);
          });
        }
        return;
      }

      haptics.selection();
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      }) as { defaultPrevented?: boolean } | undefined;

      if (event?.defaultPrevented) return;

      tabNavigationGuard.tryNavigate(() => {
        const fromTab = resolveTabRouteName(activeRouteName ?? '');
        const toTab = resolveTabRouteName(route.name);
        if (fromTab && toTab) beginTransition(fromTab, toTab);
        navigation.navigate(route.name);
      });
    },
    [activeRouteName, beginTransition, navigation, router, state.index, state.routes],
  );

  const handleTabLongPress = useCallback(
    (routeKey: string) => {
      navigation.emit({ type: 'tabLongPress', target: routeKey });
    },
    [navigation],
  );

  const openMore = useCallback(
    (items: NavItemId[]) => {
      const enabled = items.filter((id) => isNavItemVisible(id, profile, {
        workOrders: workOrdersEnabled,
        warehouse: warehouseEnabled,
        accounting: accountingModuleEnabled,
      }));
      const labels = enabled.map((id) => getNavVisual(id).label);

      const go = (index: number) => {
        const id = enabled[index];
        if (!id) return;
        const href = getNavItemHref(id);
        if (!href || tabNavigationGuard.isLocked) return;
        tabNavigationGuard.tryNavigate(() => {
          router.push(href);
        });
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [...labels, 'Отмена'],
            cancelButtonIndex: labels.length,
            userInterfaceStyle: isDark ? 'dark' : 'light',
          },
          (buttonIndex) => {
            if (buttonIndex === labels.length) return;
            go(buttonIndex);
          },
        );
        return;
      }

      Alert.alert(
        'Ещё',
        undefined,
        [
          ...enabled.map((id, index) => ({
            text: getNavVisual(id).label,
            onPress: () => go(index),
          })),
          { text: 'Отмена', style: 'cancel' as const },
        ],
        { cancelable: true },
      );
    },
    [accountingModuleEnabled, isDark, profile, router, warehouseEnabled, workOrdersEnabled],
  );

  const tabPressHandlers = useMemo(() => {
    const handlers = new Map<string, () => void>();
    for (const entry of tabEntries) {
      if (entry.kind === 'more') continue;
      const route = state.routes.find((r) => r.name === entry.expoName);
      if (!route) continue;
      const focused = route.key === activeRouteKey;
      handlers.set(route.key, () => handleTabPress(route, focused));
    }
    return handlers;
  }, [activeRouteKey, handleTabPress, state.routes, tabEntries]);

  const tabLongPressHandlers = useMemo(() => {
    const handlers = new Map<string, () => void>();
    for (const entry of tabEntries) {
      if (entry.kind === 'more') continue;
      const route = state.routes.find((r) => r.name === entry.expoName);
      if (!route) continue;
      handlers.set(route.key, () => handleTabLongPress(route.key));
    }
    return handlers;
  }, [handleTabLongPress, state.routes, tabEntries]);

  if (hideTabBar) return null;

  const shellPadding = {
    paddingHorizontal: horizontalPadding,
    paddingVertical: TAB_BAR_VERTICAL_PADDING,
  };

  const renderTabs = () => (
    <View style={{ height: TAB_BAR_ROW_HEIGHT, justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 2,
            bottom: 2,
            width: capsuleWidth,
            borderRadius: rhythm.cardRadius,
            backgroundColor: colors.sidebarAccent,
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
                  activeColor={colors.primary}
                  inactiveIconColor={inactiveIconColor}
                  inactiveLabelColor={inactiveLabelColor}
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
                activeColor={colors.primary}
                inactiveIconColor={inactiveIconColor}
                inactiveLabelColor={inactiveLabelColor}
                onPress={tabPressHandlers.get(route.key) ?? (() => handleTabPress(route, focused))}
                onLongPress={tabLongPressHandlers.get(route.key) ?? (() => handleTabLongPress(route.key))}
              />
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing[3],
        paddingBottom: Math.max(insets.bottom, spacing[2]),
      }}
    >
      <View
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        style={{
          borderRadius: rhythm.panelRadius,
          overflow: 'hidden',
          borderWidth: rhythm.hairline,
          borderColor: colors.borderMuted,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.glass,
          ...shadows.xs,
        }}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 22 : 32}
            tint={isDark ? 'dark' : 'light'}
            style={{ ...shellPadding, backgroundColor: colors.glass }}
          >
            {renderTabs()}
          </BlurView>
        ) : (
          <View style={{ ...shellPadding, backgroundColor: colors.glass }}>{renderTabs()}</View>
        )}
      </View>
    </View>
  );
});
