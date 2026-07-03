import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/navigation/app-tab-bar';
import { TabTransitionProvider } from '@/components/navigation/tab-transition-context';

export default function TabLayout() {
  return (
    <TabTransitionProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          lazy: true,
        }}
        tabBar={(props) => <AppTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
          }}
        />
        <Tabs.Screen
          name="accounting"
          options={{
            title: 'Accounting',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </TabTransitionProvider>
  );
}
