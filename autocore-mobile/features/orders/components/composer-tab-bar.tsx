import { useEffect, useState, type ComponentType } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { ordersSpring } from '../animation/orders-timeline';
import type { ComposerTab } from '../animation/use-composer-tab-state';
import { wo } from '../theme/wo-visual';

const SEGMENT_INSET = 2;

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

/** Icon-only industrial toolbar for composition tabs. */
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
        borderRadius: wo.radiusSm,
        borderWidth: wo.rule,
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
              borderRadius: wo.radiusSm - 1,
              backgroundColor: colors.card,
              borderWidth: wo.rule,
              borderColor: colors.border,
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
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onTabChange(item.id);
            }}
            style={{
              flex: 1,
              minHeight: wo.touch,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <View style={{ position: 'relative' }}>
              <Icon
                size="sm"
                color={selected ? colors.foreground : colors.mutedForeground}
                strokeWidth={selected ? 2 : 1.75}
              />
              {item.badge && item.badge > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -10,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 2,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.foreground,
                  }}
                >
                  <Text
                    variant="caption"
                    style={{ fontSize: 9, fontWeight: '700', color: colors.background, lineHeight: 12 }}
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
