import { useCallback, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GripVerticalIcon } from '@/assets/icons';
import { Switch, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

import { NAV_ITEM_DEFINITIONS } from '../data/navigation-items';
import type { NavItemId } from '../types';

const ROW_HEIGHT = 48;
const ROW_STRIDE = ROW_HEIGHT;

type NavigationEditorListProps = {
  order: NavItemId[];
  enabled: Record<NavItemId, boolean>;
  onToggle: (id: NavItemId) => void;
  onMove: (from: number, to: number) => void;
};

export function NavigationEditorList({ order, enabled, onToggle, onMove }: NavigationEditorListProps) {
  const { colors } = useTheme();

  const handleMove = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      onMove(from, to);
      haptics.selection();
    },
    [onMove],
  );

  return (
    <View>
      {order.map((id, index) => {
        const def = NAV_ITEM_DEFINITIONS[id];
        const isEnabled = enabled[id];

        return (
          <View key={id}>
            {index > 0 ? (
              <View
                style={{
                  height: rhythm.hairline,
                  backgroundColor: colors.border,
                  marginLeft: rhythm.cardPadX,
                }}
              />
            ) : null}
            <NavEditorRow
              index={index}
              total={order.length}
              onMoveTo={(to) => handleMove(index, to)}
            >
              <View
                style={{
                  minHeight: ROW_HEIGHT,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: rhythm.inline,
                  paddingLeft: rhythm.cardPadX - 4,
                  paddingRight: rhythm.cardPadX,
                  opacity: isEnabled ? 1 : 0.45,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: ROW_HEIGHT,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GripVerticalIcon size="sm" color={colors.mutedForeground} strokeWidth={1.8} />
                </View>

                <Text
                  variant="body"
                  style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.foreground }}
                  numberOfLines={1}
                >
                  {def.title}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move up"
                  disabled={index === 0}
                  hitSlop={8}
                  onPress={() => {
                    if (index === 0) return;
                    handleMove(index, index - 1);
                  }}
                  style={{ paddingHorizontal: 6, opacity: index === 0 ? 0.25 : 0.7 }}
                >
                  <Text variant="caption" style={{ color: colors.mutedForeground }}>
                    ↑
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move down"
                  disabled={index === order.length - 1}
                  hitSlop={8}
                  onPress={() => {
                    if (index === order.length - 1) return;
                    handleMove(index, index + 1);
                  }}
                  style={{
                    paddingHorizontal: 6,
                    marginRight: 4,
                    opacity: index === order.length - 1 ? 0.25 : 0.7,
                  }}
                >
                  <Text variant="caption" style={{ color: colors.mutedForeground }}>
                    ↓
                  </Text>
                </Pressable>

                <Switch
                  value={isEnabled}
                  onValueChange={() => {
                    haptics.selection();
                    onToggle(id);
                  }}
                />
              </View>
            </NavEditorRow>
          </View>
        );
      })}
    </View>
  );
}

type NavEditorRowProps = {
  children: React.ReactNode;
  index: number;
  total: number;
  onMoveTo: (to: number) => void;
};

function NavEditorRow({ children, index, total, onMoveTo }: NavEditorRowProps) {
  const translateY = useSharedValue(0);
  const indexSV = useSharedValue(index);
  const totalSV = useSharedValue(total);

  useEffect(() => {
    indexSV.value = index;
    totalSV.value = total;
  }, [index, indexSV, total, totalSV]);

  const commitMove = useCallback(
    (from: number, translationY: number, count: number) => {
      const delta = Math.round(translationY / ROW_STRIDE);
      const to = Math.max(0, Math.min(count - 1, from + delta));
      if (to !== from) onMoveTo(to);
    },
    [onMoveTo],
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(140)
    .activeOffsetY([-6, 6])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      runOnJS(commitMove)(indexSV.value, event.translationY, totalSV.value);
      translateY.value = withTiming(0, { duration: 120 });
    })
    .onFinalize(() => {
      translateY.value = withTiming(0, { duration: 120 });
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: translateY.value === 0 ? 0 : 10,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={dragStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
