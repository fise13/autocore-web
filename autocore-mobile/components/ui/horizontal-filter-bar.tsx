import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { screenMotion } from '@/theme/screen';

import { Text } from './text';

export type HorizontalFilterOption<T extends string> = {
  value: T;
  label: string;
};

type TabLayout = { x: number; width: number };

type HorizontalFilterBarProps<T extends string> = {
  options: readonly HorizontalFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Finance-style horizontal filter chips with sliding primary capsule. */
export function HorizontalFilterBar<T extends string>({
  options,
  value,
  onChange,
}: HorizontalFilterBarProps<T>) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Partial<Record<string, TabLayout>>>({});
  const [ready, setReady] = useState(false);

  const capsuleX = useSharedValue(0);
  const capsuleW = useSharedValue(0);
  const chipHeight = rhythm.filterHeight;

  const moveCapsule = (tab: T, animate: boolean) => {
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
        x: Math.max(layout.x - rhythm.pad, 0),
        animated: !reducedMotion,
      });
    }
  }, [ready, reducedMotion, value]);

  const onChipLayout = (tab: T, event: LayoutChangeEvent) => {
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
      contentContainerStyle={{ paddingVertical: 2 }}
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
              height: chipHeight,
              borderRadius: chipHeight / 2,
              backgroundColor: colors.primary,
            },
            capsuleStyle,
          ]}
        />

        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onLayout={(event) => onChipLayout(option.value, event)}
              onPress={() => {
                if (active) return;
                haptics.selection();
                onChange(option.value);
              }}
            >
              <View
                style={{
                  height: chipHeight,
                  paddingHorizontal: 16,
                  borderRadius: chipHeight / 2,
                  borderWidth: rhythm.hairline,
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
                    fontSize: rhythm.label,
                    fontWeight: '600',
                    color: active ? colors.primaryForeground : colors.textSecondary,
                  }}
                >
                  {option.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
