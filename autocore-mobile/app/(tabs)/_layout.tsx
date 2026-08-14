import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionSheetHost } from '@/components/navigation/action-sheet-host';
import { LiquidGlassTabBar } from '@/components/navigation/liquid-glass-tab-bar';
import { TabTransitionProvider } from '@/components/navigation/tab-transition-context';
import { OperationsLiveActivityHost } from '@/features/live-activity/operations-live-activity-host';
import { assertLiveActivityAppGroup } from '@/features/live-activity/register-operations-live-activity';
import { useTheme } from '@/hooks/use-theme';

assertLiveActivityAppGroup();

/**
 * Autocore shell: LiquidGlassTabBar (UIGlassEffect) — Home · Work · (+) · Finance · Settings.
 * ActionSheetHost is an absolute overlay (not Modal) so New always paints.
 */
export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <TabTransitionProvider>
      <View style={styles.shell}>
        <Tabs
          tabBar={(props) => <LiquidGlassTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarStyle: { position: 'absolute' },
            sceneStyle: { backgroundColor: colors.background },
            animation: 'none',
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="work" options={{ title: 'Work' }} />
          <Tabs.Screen
            name="action"
            options={{ title: 'Action', tabBarLabel: 'Action' }}
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
              },
            }}
          />
          <Tabs.Screen name="accounting" options={{ title: 'Finance' }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

          <Tabs.Screen name="scan" options={{ href: null, title: 'Scan' }} />
          <Tabs.Screen name="ai" options={{ href: null, title: 'AI' }} />
        </Tabs>
        <ActionSheetHost />
        <OperationsLiveActivityHost />
      </View>
    </TabTransitionProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
