import { memo, useEffect } from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart3Icon, HouseIcon, LayersIcon, SettingsIcon } from '@/assets/icons';
import { LiquidGlassSurface } from '@/components/navigation/liquid-glass-surface';
import { Text } from '@/components/ui/text';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import {
  DOCK_ACTION_FILL,
  DOCK_ACTION_FILL_DARK,
  DOCK_ACTION_HIT_SIZE,
  DOCK_ACTION_ICON_SIZE,
  DOCK_ACTION_ICON_STROKE,
  DOCK_ACTION_INK,
  DOCK_ACTION_INK_DARK,
  DOCK_ACTION_RADIUS,
  DOCK_ACTION_SIZE,
  DOCK_BAR_WIDTH,
  DOCK_BOTTOM_GAP,
  DOCK_CORNER_RADIUS,
  DOCK_HORIZONTAL_INSET,
  DOCK_ICON_SIZE,
  DOCK_INK,
  DOCK_ITEM_WIDTH,
  DOCK_LABEL_SIZE,
  DOCK_MUTED_ALPHA,
  DOCK_VISUAL_HEIGHT,
} from '@/lib/navigation/floating-tab-bar-inset';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import type { PlaygroundTabId } from './playground-types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FOCUS_DURATION = 200;

const PLUS_TO_X_SPRING = {
  mass: 1,
  stiffness: (2 * Math.PI / 0.32) ** 2,
  damping: (4 * Math.PI * 0.8) / 0.32,
} as const;

const TABS: Array<{
  id: PlaygroundTabId;
  label: string;
  Icon: typeof HouseIcon;
}> = [
  { id: 'home', label: 'Home', Icon: HouseIcon },
  { id: 'work', label: 'Work', Icon: LayersIcon },
  { id: 'finance', label: 'Finance', Icon: BarChart3Icon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

function PlusMark({ color }: { color: string }) {
  const arm = DOCK_ACTION_ICON_STROKE;
  const span = DOCK_ACTION_ICON_SIZE;
  return (
    <View style={styles.plusBox} accessibilityElementsHidden>
      <View
        style={[
          styles.plusArm,
          { width: span, height: arm, borderRadius: arm / 2, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.plusArm,
          { width: arm, height: span, borderRadius: arm / 2, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function DockItem({
  label,
  Icon,
  focused,
  onPress,
}: {
  label: string;
  Icon: typeof HouseIcon;
  focused: boolean;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    const target = focused ? 1 : 0;
    focus.value = reducedMotion
      ? target
      : withTiming(target, { duration: FOCUS_DURATION, easing: Easing.out(Easing.cubic) });
  }, [focus, focused, reducedMotion]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [DOCK_MUTED_ALPHA, 1]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [DOCK_MUTED_ALPHA, 1]),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.94, tokens.motion.springs.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, tokens.motion.springs.press);
      }}
      style={[styles.item, pressStyle]}
      hitSlop={6}
    >
      <View style={styles.itemContent}>
        <Animated.View style={[styles.glyphBox, glyphStyle]}>
          <Icon size={DOCK_ICON_SIZE} color={DOCK_INK} strokeWidth={focused ? 2.2 : 1.8} />
        </Animated.View>
        <Animated.View style={labelStyle}>
          <Text
            variant="caption2"
            style={{
              marginTop: 3,
              fontWeight: focused ? '600' : '500',
              color: DOCK_INK,
              fontSize: DOCK_LABEL_SIZE,
              lineHeight: 14,
              letterSpacing: 0.1,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
}

function CenterAction({ open, onPress }: { open: boolean; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const { isDark } = useTheme();
  const rotation = useSharedValue(open ? 45 : 0);
  const scale = useSharedValue(1);
  const fill = isDark ? DOCK_ACTION_FILL_DARK : DOCK_ACTION_FILL;
  const ink = isDark ? DOCK_ACTION_INK_DARK : DOCK_ACTION_INK;

  useEffect(() => {
    if (reducedMotion) {
      rotation.value = open ? 45 : 0;
      scale.value = 1;
      return;
    }
    rotation.value = withSpring(open ? 45 : 0, PLUS_TO_X_SPRING);
    if (open) {
      scale.value = withSequence(
        withTiming(1.06, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withSpring(1, PLUS_TO_X_SPRING),
      );
    } else {
      scale.value = withSequence(
        withTiming(0.96, { duration: 80, easing: Easing.out(Easing.cubic) }),
        withSpring(1, PLUS_TO_X_SPRING),
      );
    }
  }, [open, reducedMotion, rotation, scale]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  return (
    <View style={styles.actionSlot}>
      <RNPressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close Autocore' : 'Ask Autocore'}
        accessibilityHint={open ? 'Closes the AI bubble' : 'Opens Autocore as a bubble'}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        style={styles.actionHit}
        hitSlop={8}
      >
        <View
          style={[
            styles.actionOrbSolid,
            {
              backgroundColor: fill,
              borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <Animated.View style={markStyle}>
            <PlusMark color={ink} />
          </Animated.View>
        </View>
      </RNPressable>
    </View>
  );
}

type Props = {
  activeTab: PlaygroundTabId;
  actionOpen: boolean;
  flushBottom?: boolean;
  onTabPress: (id: PlaygroundTabId) => void;
  onActionPress: () => void;
};

export const PlaygroundDock = memo(function PlaygroundDock({
  activeTab,
  actionOpen,
  flushBottom = false,
  onTabPress,
  onActionPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const barWidth = Math.min(
    DOCK_BAR_WIDTH,
    Math.max(280, windowWidth - DOCK_HORIZONTAL_INSET * 2),
  );
  const bottomPad = flushBottom ? DOCK_BOTTOM_GAP : insets.bottom + DOCK_BOTTOM_GAP;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <LiquidGlassSurface
        radius={DOCK_CORNER_RADIUS}
        isInteractive
        containerStyle={[
          styles.glassContainer,
          {
            width: barWidth,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
          },
        ]}
        style={[styles.unifiedBar, { width: barWidth }]}
      >
        <DockItem
          label={TABS[0].label}
          Icon={TABS[0].Icon}
          focused={activeTab === 'home'}
          onPress={() => onTabPress('home')}
        />
        <DockItem
          label={TABS[1].label}
          Icon={TABS[1].Icon}
          focused={activeTab === 'work'}
          onPress={() => onTabPress('work')}
        />
        <CenterAction open={actionOpen} onPress={onActionPress} />
        <DockItem
          label={TABS[2].label}
          Icon={TABS[2].Icon}
          focused={activeTab === 'finance'}
          onPress={() => onTabPress('finance')}
        />
        <DockItem
          label={TABS[3].label}
          Icon={TABS[3].Icon}
          focused={activeTab === 'settings'}
          onPress={() => onTabPress('settings')}
        />
      </LiquidGlassSurface>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    paddingHorizontal: DOCK_HORIZONTAL_INSET,
  },
  glassContainer: {
    height: DOCK_VISUAL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedBar: {
    height: DOCK_VISUAL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  item: {
    width: DOCK_ITEM_WIDTH,
    height: DOCK_VISUAL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBox: {
    width: DOCK_ICON_SIZE,
    height: DOCK_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSlot: {
    width: DOCK_ITEM_WIDTH,
    height: DOCK_VISUAL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  actionHit: {
    width: DOCK_ACTION_HIT_SIZE,
    height: DOCK_ACTION_HIT_SIZE,
    borderRadius: DOCK_ACTION_HIT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOrbSolid: {
    width: DOCK_ACTION_SIZE,
    height: DOCK_ACTION_SIZE,
    borderRadius: DOCK_ACTION_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  plusBox: {
    width: DOCK_ACTION_ICON_SIZE,
    height: DOCK_ACTION_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusArm: {
    position: 'absolute',
  },
});
