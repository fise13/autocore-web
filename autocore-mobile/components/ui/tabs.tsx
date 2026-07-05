import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { haptics, radius, spacing } from '@/theme';
import { screenMotion } from '@/theme/screen';

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

type TabLayout = { x: number; width: number };

export function Tabs({ tabs, value, onValueChange, children }: TabsProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const layouts = useRef<Record<string, TabLayout>>({});
  const [ready, setReady] = useState(false);

  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const contentY = useSharedValue(0);

  const movePill = (tabValue: string, animate: boolean) => {
    const layout = layouts.current[tabValue];
    if (!layout) return;
    if (reducedMotion || !animate) {
      pillX.value = layout.x;
      pillW.value = layout.width;
      return;
    }
    pillX.value = withSpring(layout.x, screenMotion.press);
    pillW.value = withSpring(layout.width, screenMotion.press);
  };

  useEffect(() => {
    movePill(value, ready);
    if (reducedMotion) {
      contentOpacity.value = 1;
      contentY.value = 0;
      return;
    }
    contentOpacity.value = 0.35;
    contentY.value = 4;
    contentOpacity.value = withTiming(1, { duration: 160 });
    contentY.value = withTiming(0, { duration: 160 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready, reducedMotion]);

  const onTabLayout = (tabValue: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    layouts.current[tabValue] = { x, width };
    if (tabValue === value) {
      movePill(tabValue, false);
      setReady(true);
    }
  };

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
    opacity: ready ? 1 : 0,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  return (
    <View style={{ gap: spacing[4] }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing[4] }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 3,
            borderRadius: radius.lg,
            backgroundColor: colors.muted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 3,
                bottom: 3,
                left: 0,
                borderRadius: radius.md,
                backgroundColor: colors.card,
              },
              pillStyle,
            ]}
          />
          {tabs.map((tab) => {
            const active = tab.value === value;
            return (
              <Pressable
                key={tab.value}
                onLayout={(event) => onTabLayout(tab.value, event)}
                onPress={() => {
                  if (tab.value === value) return;
                  haptics.selection();
                  onValueChange(tab.value);
                }}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1.5],
                  borderRadius: radius.md,
                  zIndex: 1,
                }}
              >
                <Text
                  variant="buttonSmall"
                  numberOfLines={1}
                  style={{
                    color: active ? colors.foreground : colors.mutedForeground,
                    fontWeight: active ? '600' : '500',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Animated.View style={panelStyle} key={value}>
        {children}
      </Animated.View>
    </View>
  );
}
