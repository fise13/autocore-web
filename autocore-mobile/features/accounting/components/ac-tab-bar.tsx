import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { screenMotion } from '@/theme/screen';

import { ACCOUNTING_TABS, type AccountingTab } from '../constants/tabs';
import { ac } from '../layout';

type TabLayout = { x: number; width: number };

type AcTabBarProps = {
  value: AccountingTab;
  onChange: (tab: AccountingTab) => void;
};

export function AcTabBar({ value, onChange }: AcTabBarProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Partial<Record<AccountingTab, TabLayout>>>({});
  const [ready, setReady] = useState(false);

  const capsuleX = useSharedValue(0);
  const capsuleW = useSharedValue(0);

  const moveCapsule = (tab: AccountingTab, animate: boolean) => {
    const layout = layouts.current[tab];
    if (!layout) return;

    if (reducedMotion || !animate) {
      capsuleX.value = layout.x;
      capsuleW.value = layout.width;
      return;
    }

    capsuleX.value = withSpring(layout.x, screenMotion.press);
    capsuleW.value = withSpring(layout.width, screenMotion.press);
  };

  useEffect(() => {
    moveCapsule(value, ready);

    const layout = layouts.current[value];
    if (layout && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: Math.max(layout.x - ac.pad, 0),
        animated: !reducedMotion,
      });
    }
  }, [ready, reducedMotion, value]);

  const onChipLayout = (tab: AccountingTab, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    layouts.current[tab] = { x, width };
    if (tab === value) {
      moveCapsule(tab, false);
      setReady(true);
    }
  };

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: capsuleX.value }],
    width: capsuleW.value,
    opacity: ready ? 1 : 0,
  }));

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingVertical: 2, paddingRight: ac.pad }}
    >
      <View style={{ flexDirection: 'row', gap: 8, position: 'relative' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              height: ac.filterHeight,
              borderRadius: ac.filterHeight / 2,
              backgroundColor: colors.primary,
            },
            capsuleStyle,
          ]}
        />

        {ACCOUNTING_TABS.map((tab) => {
          const active = tab.value === value;
          return (
            <Pressable
              key={tab.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onLayout={(event) => onChipLayout(tab.value, event)}
              onPress={() => {
                if (active) return;
                haptics.selection();
                onChange(tab.value);
              }}
            >
              <View
                style={{
                  height: ac.filterHeight,
                  paddingHorizontal: 16,
                  borderRadius: ac.filterHeight / 2,
                  borderWidth: ac.hairline,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? 'transparent' : colors.sidebarAccent,
                  borderColor: active ? colors.primary : colors.borderMuted,
                  zIndex: 1,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    fontSize: ac.label,
                    fontWeight: '600',
                    color: active ? colors.primaryForeground : colors.textSecondary,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

type AcTabPanelProps = {
  tab: AccountingTab;
  children: ReactNode;
};

export function AcTabPanel({ tab, children }: AcTabPanelProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <View key={tab}>{children}</View>;
  }

  return (
    <Animated.View
      key={tab}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(140)}
      style={{ gap: ac.section }}
    >
      {children}
    </Animated.View>
  );
}
