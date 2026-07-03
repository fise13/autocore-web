import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ChevronsUpDownIcon } from '@/assets/icons';
import { Switch, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { NAV_ITEM_DEFINITIONS } from '../data/navigation-items';
import { profileLayout } from '@/features/profile/layout';
import type { NavItemId } from '../types';

const ROW_HEIGHT = 72;

type NavigationEditorListProps = {
  order: NavItemId[];
  enabled: Record<NavItemId, boolean>;
  onToggle: (id: NavItemId) => void;
  onMove: (from: number, to: number) => void;
};

export function NavigationEditorList({ order, enabled, onToggle, onMove }: NavigationEditorListProps) {
  const { colors } = useTheme();
  const [draggingId, setDraggingId] = useState<NavItemId | null>(null);

  const handleMove = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      onMove(from, to);
      haptics.selection();
    },
    [onMove],
  );

  return (
    <View style={{ gap: 8, paddingHorizontal: profileLayout.pad }}>
      {order.map((id, index) => {
        const def = NAV_ITEM_DEFINITIONS[id];
        const Icon = def.icon;
        const isEnabled = enabled[id];
        const isDragging = draggingId === id;

        return (
          <NavEditorRow
            key={id}
            index={index}
            total={order.length}
            isDragging={isDragging}
            onDragStart={() => setDraggingId(id)}
            onDragEnd={() => setDraggingId(null)}
            onSwap={(direction) => {
              const target = direction === 'up' ? index - 1 : index + 1;
              if (target >= 0 && target < order.length) handleMove(index, target);
            }}
          >
            <Animated.View
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}
              layout={Layout.springify()}
              style={{
                borderRadius: profileLayout.groupRadius,
                borderWidth: profileLayout.hairline,
                borderColor: isDragging ? colors.primary : colors.border,
                backgroundColor: colors.card,
                opacity: isEnabled ? 1 : 0.72,
              }}
            >
              <View
                style={{
                  minHeight: ROW_HEIGHT,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingLeft: 12,
                  paddingRight: 16,
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: toneBackground(colors.primary, isEnabled ? 0.12 : 0.06),
                  }}
                >
                  <Icon size="sm" color={isEnabled ? colors.primary : colors.mutedForeground} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="body" style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.1 }}>
                    {def.title}
                  </Text>
                  <Text variant="caption" color="muted" style={{ lineHeight: 16 }}>
                    {def.description}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => {
                    haptics.selection();
                    onToggle(id);
                  }}
                />
              </View>
            </Animated.View>
          </NavEditorRow>
        );
      })}
    </View>
  );
}

type NavEditorRowProps = {
  children: React.ReactNode;
  index: number;
  total: number;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSwap: (direction: 'up' | 'down') => void;
};

function NavEditorRow({
  children,
  index,
  total,
  isDragging,
  onDragStart,
  onDragEnd,
  onSwap,
}: NavEditorRowProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      runOnJS(onDragStart)();
      scale.value = withSpring(1.02);
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
      if (event.translationY < -ROW_HEIGHT * 0.45 && index > 0) {
        runOnJS(onSwap)('up');
        translateY.value = 0;
      } else if (event.translationY > ROW_HEIGHT * 0.45 && index < total - 1) {
        runOnJS(onSwap)('down');
        translateY.value = 0;
      }
    })
    .onEnd(() => {
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      runOnJS(onDragEnd)();
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    zIndex: isDragging ? 10 : 0,
  }));

  return (
    <Animated.View style={dragStyle} layout={Layout.springify()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <GestureDetector gesture={pan}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Перетащить"
            onPressIn={() => haptics.light()}
            style={{
              width: 32,
              height: ROW_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronsUpDownIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        </GestureDetector>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </Animated.View>
  );
}
