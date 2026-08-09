import type React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiGlassAction } from '@/components/navigation/ai-glass-action';
import { AiGlassProgressProvider } from '@/components/navigation/ai-glass-progress';
import {
  LiquidGlassTabBar,
  type LiquidGlassTabBarProps,
} from '@/components/navigation/liquid-glass-tab-bar';
import { TabTransitionProvider } from '@/components/navigation/tab-transition-context';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useSession } from '@/hooks/use-session';
import { getAiActionOffset } from '@/lib/navigation/floating-tab-bar-inset';
import { isNavItemVisible } from '@/lib/navigation/nav-item-availability';
import { TAB_SPECS } from '@/lib/navigation/tab-specs';

/**
 * Fixed tab bar.
 *
 * The set and its order are product decisions, not user settings — a control
 * centre people can rearrange is one they have to re-learn. Only permissions
 * and disabled company modules can take a tab away.
 *
 * The bar is drawn by us rather than by UIKit: a system tab bar cannot be given
 * the 76pt shell, the 16pt side margins or a capsule that travels between slots
 * as one object. Routing is untouched — the same route files, the same names,
 * the same `tabPress` semantics; only the chrome changed.
 */
const TAB_SCREEN_OPTIONS = {
  headerShown: false,
  freezeOnBlur: true,
} as const;

function renderTabBar(props: LiquidGlassTabBarProps) {
  return <LiquidGlassTabBar {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { profile } = useSession();
  const workOrders = useCompanyModuleEnabled('workOrders');
  const warehouse = useCompanyModuleEnabled('warehouse');
  const accounting = useCompanyModuleEnabled('accounting');

  const hiddenByRoute = useMemo(() => {
    const modules = { workOrders, warehouse, accounting };
    return new Map(
      TAB_SPECS.map((spec) => [
        spec.route,
        spec.navId === null || !isNavItemVisible(spec.navId, profile, modules),
      ]),
    );
  }, [accounting, profile, warehouse, workOrders]);

  return (
    // `useNavigateTab` still reads this context from deep links across the app.
    <TabTransitionProvider>
      <AiGlassProgressProvider>
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={TAB_SCREEN_OPTIONS}
            tabBar={renderTabBar as React.ComponentProps<typeof Tabs>['tabBar']}
          >
            {TAB_SPECS.map((spec) => (
              <Tabs.Screen
                key={spec.route}
                name={spec.route}
                options={{
                  title: spec.label,
                  // A route the user cannot open stays unreachable; `scan` keeps
                  // its route and every entry point, it just has no bar slot.
                  href: hiddenByRoute.get(spec.route) ? null : undefined,
                }}
              />
            ))}
          </Tabs>

          {/* Global AI action — a separate glass object beside the bar. */}
          <AiGlassAction bottomOffset={getAiActionOffset(insets.bottom)} />
        </View>
      </AiGlassProgressProvider>
    </TabTransitionProvider>
  );
}
