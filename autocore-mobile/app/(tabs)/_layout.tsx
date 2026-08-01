import { useMemo } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';

import { TabTransitionProvider } from '@/components/navigation/tab-transition-context';
import { useCompanyModuleEnabled, useTheme } from '@/hooks';
import { useSession } from '@/hooks/use-session';
import { isNavItemVisible } from '@/lib/navigation/nav-item-availability';
import { TAB_SPECS } from '@/lib/navigation/tab-specs';

/**
 * Fixed tab bar.
 *
 * The set and its order are product decisions, not user settings — a control
 * centre people can rearrange is one they have to re-learn. Only permissions
 * and disabled company modules can take a tab away.
 */
export default function TabLayout() {
  const { colors } = useTheme();
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
    // `useNavigateTab` still reads this context from deep links across the app;
    // the native bar animates its own transitions.
    <TabTransitionProvider>
      <NativeTabs
        tintColor={colors.primary}
        minimizeBehavior="onScrollDown"
        labelStyle={{ fontSize: 10, fontWeight: '600' }}
      >
        {TAB_SPECS.map((spec) => (
          <NativeTabs.Trigger
            key={spec.route}
            name={spec.route}
            hidden={hiddenByRoute.get(spec.route) ?? true}
            role={spec.role}
          >
            <NativeTabs.Trigger.Icon sf={spec.sf} />
            <NativeTabs.Trigger.Label>{spec.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </TabTransitionProvider>
  );
}
