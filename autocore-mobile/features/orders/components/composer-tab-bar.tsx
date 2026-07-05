import { useEffect, useState, type ComponentType } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { ordersSpring } from '../animation/orders-timeline';
import type { ComposerTab } from '../animation/use-composer-tab-state';
import { ordersLayout } from '../layout';

const SEGMENT_INSET = 3;

type TabIcon = ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;

export type ComposerTabOption = {
  id: ComposerTab;
  label: string;
  icon: TabIcon;
  badge?: number;
};

type ComposerTabBarProps = {
  tabs: ComposerTabOption[];
  activeTab: ComposerTab;
  onTabChange: (tab: ComposerTab) => void;
};

export function ComposerTabBar({ tabs, activeTab, onTabChange }: ComposerTabBarProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  const activeIndex = Math.max(
    tabs.findIndex((item) => item.id === activeTab),
    0,
  );

  useEffect(() => {
    if (!trackWidth || tabs.length === 0) return;

    const innerWidth = trackWidth - SEGMENT_INSET * 2;
    const segmentWidth = innerWidth / tabs.length;
    const nextX = SEGMENT_INSET + activeIndex * segmentWidth;

    if (reduced) {
      pillX.value = nextX;
      pillWidth.value = segmentWidth;
      return;
    }

    pillX.value = withSpring(nextX, ordersSpring.chip);
    pillWidth.value = withSpring(segmentWidth, ordersSpring.chip);
  }, [activeIndex, pillWidth, pillX, reduced, tabs.length, trackWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  return (
    <View
      onLayout={onTrackLayout}
      style={{
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: ordersLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.secondary,
        padding: SEGMENT_INSET,
        position: 'relative',
      }}
    >
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: SEGMENT_INSET,
              bottom: SEGMENT_INSET,
              left: 0,
              borderRadius: 9,
              backgroundColor: colors.card,
            },
            pillStyle,
          ]}
        />
      ) : null}

      {tabs.map((item) => {
        const Icon = item.icon;
        const selected = activeTab === item.id;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              onTabChange(item.id);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              gap: 4,
              zIndex: 1,
            }}
          >
            <Icon size="sm" color={selected ? colors.primary : colors.mutedForeground} strokeWidth={1.85} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  fontWeight: selected ? '600' : '500',
                  color: selected ? colors.foreground : colors.mutedForeground,
                }}
              >
                {item.label}
              </Text>
              {item.badge && item.badge > 0 ? (
                <View
                  style={{
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: toneBackground(colors.primary, 0.12),
                  }}
                >
                  <Text
                    variant="caption"
                    style={{ fontSize: 9, fontWeight: '700', color: colors.primary, lineHeight: 12 }}
                  >
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
