import { useEffect, useState, type ComponentType } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics, tokens } from '@/theme';

import { ordersSpring } from '../animation/orders-timeline';
import type { ComposerTab } from '../animation/use-composer-tab-state';

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

/** iOS / Music segmented control — label + optional count. */
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
        borderRadius: tokens.radius.full,
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
              borderRadius: tokens.radius.full,
              backgroundColor: colors.card,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            },
            pillStyle,
          ]}
        />
      ) : null}

      {tabs.map((item) => {
        const selected = activeTab === item.id;
        const count = item.badge && item.badge > 0 ? item.badge : null;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onTabChange(item.id);
            }}
            style={{
              flex: 1,
              minHeight: 36,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              paddingHorizontal: 4,
            }}
          >
            <Text
              variant="subheadline"
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: selected ? '600' : '500',
                color: selected ? colors.foreground : colors.mutedForeground,
                letterSpacing: -0.08,
              }}
            >
              {item.label}
              {count != null ? ` · ${count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
