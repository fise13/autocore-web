import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { haptics, radius, spacing } from '@/theme';
import { Text } from './text';

type Tab = {
  value: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
};

export function Tabs({ tabs, value, onValueChange, children }: TabsProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing[4] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View
          style={{
            flexDirection: 'row',
            gap: spacing[1],
            padding: spacing[0.5],
            borderRadius: radius.lg,
            backgroundColor: colors.muted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {tabs.map((tab) => {
            const active = tab.value === value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => {
                  haptics.selection();
                  onValueChange(tab.value);
                }}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1.5],
                  borderRadius: radius.md,
                  backgroundColor: active ? colors.card : 'transparent',
                  ...(active ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } } : {}),
                }}
              >
                <Text
                  variant="buttonSmall"
                  style={{ color: active ? colors.foreground : colors.mutedForeground }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Animated.View key={value} entering={FadeIn.duration(240)} exiting={FadeOut.duration(180)}>
        {children}
      </Animated.View>
    </View>
  );
}
