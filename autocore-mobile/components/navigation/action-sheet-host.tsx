import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
  DOCK_ACTION_SIZE,
  DOCK_BOTTOM_GAP,
  DOCK_VISUAL_HEIGHT,
} from '@/lib/navigation/floating-tab-bar-inset';
import { useActionSheetStore } from '@/lib/shell/action-sheet-store';
import type { ActionItem } from '@/lib/shell/types';
import { useShellModel } from '@/lib/shell/use-shell-model';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

/** Speech-bubble body — rounder than a card, sits above the FAB. */
const BUBBLE_W = 204;
const BUBBLE_H = 216;
const BUBBLE_RADIUS = 48;
const TAIL = 18;
const LIFT = 14;
const DISC = 48;
const HIT = 52;
const COL_GAP = 16;
const ROW_GAP = 12;
const OPEN_MS = 420;
const CLOSE_MS = 260;
const DISMISS_Y = 72;
const OPEN_EASE = Easing.bezier(0.22, 1, 0.36, 1);

const ACTION_ORDER = [
  'scan',
  'receive-engine',
  'photograph',
  'new-order',
  'add-item',
  'new-transaction',
] as const;

const FAB_SPRING = {
  mass: 1,
  stiffness: (2 * Math.PI / 0.32) ** 2,
  damping: (4 * Math.PI * 0.8) / 0.32,
} as const;

function pickActions(items: ActionItem[]): ActionItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ACTION_ORDER.map((id) => byId.get(id)).filter((item): item is ActionItem => Boolean(item));
}

type ActionDiscProps = {
  item: ActionItem;
  index: number;
  progress: SharedValue<number>;
  accent?: boolean;
  onPick: (href?: string) => void;
};

function ActionDisc({ item, index, progress, accent, onPick }: ActionDiscProps) {
  const { colors, isDark } = useTheme();
  const [tip, setTip] = useState(false);
  const hideTip = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useSharedValue(1);
  const row = Math.floor(index / 2);
  const col = index % 2;
  const start = 0.36 + (row * 2 + col) * 0.04;

  const enterStyle = useAnimatedStyle(() => {
    const local = interpolate(progress.value, [start, start + 0.18], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: local,
      transform: [
        { translateY: interpolate(local, [0, 1], [10, 0]) },
        { scale: interpolate(local, [0, 1], [0.78, 1]) * press.value },
      ],
    };
  });

  const showTip = () => {
    haptics.light();
    setTip(true);
    if (hideTip.current) clearTimeout(hideTip.current);
    hideTip.current = setTimeout(() => setTip(false), 1400);
  };

  return (
    <View style={styles.cell}>
      {tip ? (
        <View pointerEvents="none" style={styles.tip}>
          <Text numberOfLines={1} style={styles.tipText}>
            {item.title}
          </Text>
        </View>
      ) : null}
      <Animated.View style={enterStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.title}
          accessibilityHint={item.subtitle}
          delayLongPress={380}
          onLongPress={showTip}
          onPressIn={() => {
            press.value = withTiming(0.96, { duration: 80 });
          }}
          onPressOut={() => {
            press.value = withTiming(1, { duration: 120 });
          }}
          onPress={() => onPick(item.href)}
          style={styles.hit}
        >
          <View
            style={[
              styles.disc,
              isDark
                ? {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.14)',
                  }
                : null,
              accent ? { borderColor: colors.primary } : null,
            ]}
          >
            <SymbolView
              name={item.sf as SFSymbol}
              size={22}
              tintColor={accent ? colors.primary : isDark ? '#FFFFFF' : '#1A1A1A'}
              weight="regular"
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Custom action bubble that pops out above the dock FAB.
 */
export function ActionSheetHost() {
  const open = useActionSheetStore((s) => s.open);
  const dismiss = useActionSheetStore((s) => s.dismiss);
  const { actionItems } = useShellModel();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigateTab = useNavigateTab();
  const [shown, setShown] = useState(false);
  const actions = useMemo(() => pickActions(actionItems), [actionItems]);

  const progress = useSharedValue(0);
  const overlay = useSharedValue(0);
  const dragY = useSharedValue(0);

  const finishHide = useCallback(() => {
    if (useActionSheetStore.getState().open) return;
    setShown(false);
    dragY.value = 0;
  }, [dragY]);

  useEffect(() => {
    if (open) setShown(true);
  }, [open]);

  useLayoutEffect(() => {
    if (!shown) return;
    if (open) {
      overlay.value = withTiming(1, { duration: 180, easing: OPEN_EASE });
      progress.value = withTiming(1, { duration: OPEN_MS, easing: OPEN_EASE });
      return;
    }
    overlay.value = withTiming(0, { duration: 140, easing: OPEN_EASE });
    progress.value = withTiming(0, { duration: CLOSE_MS, easing: OPEN_EASE }, (finished) => {
      if (finished) runOnJS(finishHide)();
    });
  }, [finishHide, open, overlay, progress, shown]);

  const close = useCallback(() => {
    haptics.light();
    dismiss();
  }, [dismiss]);

  const onPick = useCallback(
    (href?: string) => {
      haptics.medium();
      dismiss();
      if (href) navigateTab(href);
    },
    [dismiss, navigateTab],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .failOffsetX([-28, 28])
        .onUpdate((event) => {
          if (event.translationY > 0) dragY.value = event.translationY;
        })
        .onEnd((event) => {
          if (event.translationY > DISMISS_Y || event.velocityY > 1100) {
            dragY.value = withTiming(event.translationY, { duration: 80 });
            runOnJS(dismiss)();
            return;
          }
          dragY.value = withSpring(0, FAB_SPRING);
        }),
    [dismiss, dragY],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value * 0.22,
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 1], [0, 1, 1]),
    transform: [
      { translateY: dragY.value + interpolate(progress.value, [0, 1], [36, 0]) },
      {
        scale: interpolate(progress.value, [0, 1], [0.22, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  if (!shown) return null;

  const fabTop =
    insets.bottom + DOCK_BOTTOM_GAP + (DOCK_VISUAL_HEIGHT - DOCK_ACTION_SIZE) / 2 + DOCK_ACTION_SIZE;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[styles.anchor, { bottom: fabTop + LIFT }, bubbleStyle]}
        >
          <View
            style={[
              styles.body,
              isDark
                ? {
                    backgroundColor: '#111111',
                    borderColor: 'rgba(255,255,255,0.14)',
                  }
                : null,
            ]}
          >
            <View style={styles.grid}>
              {actions.map((item, index) => (
                <ActionDisc
                  key={item.id}
                  item={item}
                  index={index}
                  progress={progress}
                  accent={item.id === 'scan'}
                  onPick={onPick}
                />
              ))}
            </View>
          </View>
          <View
            style={[
              styles.tail,
              isDark
                ? {
                    backgroundColor: '#111111',
                    borderColor: 'rgba(255,255,255,0.14)',
                  }
                : null,
            ]}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    elevation: 2000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  anchor: {
    position: 'absolute',
    alignSelf: 'center',
    width: BUBBLE_W,
    alignItems: 'center',
    transformOrigin: 'bottom',
  },
  body: {
    width: BUBBLE_W,
    minHeight: BUBBLE_H,
    borderRadius: BUBBLE_RADIUS,
    backgroundColor: '#F7F6F3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  tail: {
    width: TAIL,
    height: TAIL,
    marginTop: -TAIL / 2,
    backgroundColor: '#F7F6F3',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    transform: [{ rotate: '45deg' }],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: ROW_GAP,
    columnGap: COL_GAP,
  },
  cell: {
    width: HIT,
    height: HIT + 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hit: {
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(17,17,17,0.1)',
  },
  tip: {
    position: 'absolute',
    bottom: HIT + 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.control,
    backgroundColor: 'rgba(17,19,26,0.92)',
    maxWidth: 140,
    zIndex: 2,
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
