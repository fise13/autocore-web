import { Tabs } from 'expo-router';

import { LayoutGridIcon, SettingsIcon } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { layout, spacing } from '@/theme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: layout.tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Design System',
          tabBarIcon: ({ color }) => <LayoutGridIcon size="md" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon size="md" color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
