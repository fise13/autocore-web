import type React from 'react';
import { memo } from 'react';
import { Tabs } from 'expo-router';

import { AppTabBar, type AppTabBarProps } from '@/components/navigation/app-tab-bar';
import { TabTransitionProvider } from '@/components/navigation/tab-transition-context';

const TAB_SCREEN_OPTIONS = {
  headerShown: false,
  tabBarStyle: { display: 'none' },
  lazy: true,
  freezeOnBlur: true,
} as const;

const MemoTabBar = memo(AppTabBar);

function renderTabBar(props: AppTabBarProps) {
  return <MemoTabBar {...props} />;
}

export default function TabLayout() {
  return (
    <TabTransitionProvider>
      <Tabs
        screenOptions={TAB_SCREEN_OPTIONS}
        tabBar={renderTabBar as React.ComponentProps<typeof Tabs>['tabBar']}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="search" options={{ title: 'Search' }} />
        <Tabs.Screen name="warehouse" options={{ href: null, title: 'Warehouse' }} />
        <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
        <Tabs.Screen name="import" options={{ href: null, title: 'Import' }} />
        <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
        <Tabs.Screen name="my-earnings" options={{ title: 'My earnings' }} />
        <Tabs.Screen name="accounting" options={{ title: 'Accounting' }} />
        {/* Prefetch settings hub only — never keep CameraView mounted off-tab. */}
        <Tabs.Screen name="profile" options={{ title: 'Profile', lazy: false }} />
      </Tabs>
    </TabTransitionProvider>
  );
}
