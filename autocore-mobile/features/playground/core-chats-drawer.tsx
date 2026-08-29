import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useDesignLanguage, useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { CoreChatsRail } from './core-chats-rail';

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
};

const SHEET = tokens.motion.springs.sheet;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function CoreChatsDrawer({ open, onOpen, onClose, children }: Props) {
  const reduced = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const { shadows } = useTheme();
  const { coreChat, coreChatLayout } = useDesignLanguage();

  const railWidth = Math.max(
    240,
    windowWidth - coreChatLayout.drawerPeek,
  );
  const progress = useSharedValue(open ? 1 : 0);
  const snap = coreChatLayout.drawerSnap;
  const velocity = coreChatLayout.drawerVelocity;
  const stageRadius = coreChatLayout.drawerStageRadius;

  const settle = useCallback(
    (next: boolean) => {
      if (next) {
        haptics.selection();
        onOpen();
        return;
      }
      onClose();
    },
    [onClose, onOpen],
  );

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const closeDrawer = useCallback(() => {
    Keyboard.dismiss();
    progress.value = reduced ? 0 : withSpring(0, SHEET);
    onClose();
  }, [onClose, progress, reduced]);

  useEffect(() => {
    if (open) Keyboard.dismiss();
    progress.value = reduced
      ? open
        ? 1
        : 0
      : withSpring(open ? 1 : 0, SHEET);
  }, [open, progress, reduced]);

  const finishOpen = useCallback(
    (velocityX: number) => {
      'worklet';
      const next = progress.value > snap || velocityX > velocity;
      progress.value = reduced ? (next ? 1 : 0) : withSpring(next ? 1 : 0, SHEET);
      runOnJS(settle)(next);
    },
    [progress, reduced, settle, snap, velocity],
  );

  const finishClose = useCallback(
    (velocityX: number) => {
      'worklet';
      const next = progress.value > 1 - snap && velocityX > -velocity;
      progress.value = reduced ? (next ? 1 : 0) : withSpring(next ? 1 : 0, SHEET);
      runOnJS(settle)(next);
    },
    [progress, reduced, settle, snap, velocity],
  );

  const openPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(16)
        .failOffsetY([-24, 24])
        .onBegin(() => {
          runOnJS(dismissKeyboard)();
        })
        .onUpdate((event) => {
          progress.value = clamp(event.translationX / railWidth, 0, 1);
        })
        .onEnd((event) => {
          finishOpen(event.velocityX);
        }),
    [dismissKeyboard, finishOpen, progress, railWidth],
  );

  const closePan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-16)
        .failOffsetY([-24, 24])
        .onUpdate((event) => {
          progress.value = clamp(1 + event.translationX / railWidth, 0, 1);
        })
        .onEnd((event) => {
          finishClose(event.velocityX);
        }),
    [finishClose, progress, railWidth],
  );

  const stageStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [0, stageRadius]),
    transform: [{ translateX: progress.value * railWidth }],
  }));

  return (
    <View style={[styles.host, { backgroundColor: coreChat.drawer.backgroundColor }]}>
      <View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.rail, { width: railWidth }]}
      >
        <CoreChatsRail open={open} onClose={closeDrawer} />
      </View>

      <GestureDetector gesture={open ? closePan : openPan}>
        <Animated.View
          style={[styles.stage, coreChat.screen, shadows.elevated, stageStyle]}
        >
          <View pointerEvents={open ? 'none' : 'auto'} style={styles.body}>
            {children}
          </View>
          {open ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close chats"
              onPress={closeDrawer}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    flex: 1,
  },
  stage: {
    flex: 1,
    zIndex: 2,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
  },
});
