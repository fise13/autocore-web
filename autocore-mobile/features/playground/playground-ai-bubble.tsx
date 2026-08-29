import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowUpIcon, SparklesIcon } from '@/assets/icons';
import { GlassSheen } from '@/components/navigation/glass-sheen';
import { useDesignLanguage, useReducedMotion, useTheme } from '@/hooks';
import {
  DOCK_BOTTOM_GAP,
  DOCK_VISUAL_HEIGHT,
} from '@/lib/navigation/floating-tab-bar-inset';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

import { useCoreChatStore } from './core-chat-store';

const FOCUS_DELAY_MS = 80;
const HIDE_SETTLE_MS = 320;
const SHEET_SPRING = tokens.motion.springs.sheet;
const OPEN_EASE = Easing.bezier(0.22, 1, 0.36, 1);

function FrostedCard({
  radius,
  children,
  style,
}: {
  radius: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useTheme();
  const { coreChat } = useDesignLanguage();

  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: coreChat.compactBorder,
        },
        style,
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={coreChat.glassIntensity}
        tint={coreChat.glassTint}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: coreChat.compactFill }]}
      />
      <GlassSheen isDark={isDark} radius={radius} />
      {children}
    </View>
  );
}

type Props = {
  open: boolean;
  flushBottom?: boolean;
  onClose: () => void;
};

export function PlaygroundAiBubble({ open, flushBottom = false, onClose }: Props) {
  const router = useRouter();
  const { shadows } = useTheme();
  const { colors, coreChat, coreChatLayout } = useDesignLanguage();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [shown, setShown] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendToCore = useCoreChatStore((s) => s.send);

  const progress = useSharedValue(0);
  const overlay = useSharedValue(0);
  const dragY = useSharedValue(0);

  const resetDraft = useCallback(() => {
    setDraft('');
  }, []);

  const finishHide = useCallback(() => {
    if (open) return;
    resetDraft();
    setShown(false);
    dragY.value = 0;
  }, [dragY, open, resetDraft]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const close = useCallback(() => {
    haptics.light();
    dismissKeyboard();
    onClose();
  }, [dismissKeyboard, onClose]);

  useEffect(() => {
    if (open) {
      setShown(true);
      return;
    }
    dismissKeyboard();
  }, [dismissKeyboard, open]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!shown) return;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (open) {
      overlay.value = withSpring(1, SHEET_SPRING);
      progress.value = reducedMotion ? 1 : withSpring(1, SHEET_SPRING);
      if (focusTimer.current) clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => {
        inputRef.current?.focus();
      }, reducedMotion ? 0 : FOCUS_DELAY_MS);
      return;
    }
    overlay.value = withTiming(0, { duration: tokens.motion.duration.fast, easing: OPEN_EASE });
    progress.value = reducedMotion
      ? 0
      : withTiming(0, { duration: tokens.motion.duration.medium, easing: OPEN_EASE });
    hideTimer.current = setTimeout(finishHide, HIDE_SETTLE_MS);
  }, [finishHide, open, overlay, progress, reducedMotion, shown]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close, open]);

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    haptics.medium();
    sendToCore(text);
    setDraft('');
    dismissKeyboard();
    onClose();
    router.push('/playground/core');
  }, [dismissKeyboard, draft, onClose, router, sendToCore]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(open)
        .activeOffsetY(12)
        .failOffsetX([-28, 28])
        .onBegin(() => {
          runOnJS(dismissKeyboard)();
        })
        .onUpdate((event) => {
          if (event.translationY > 0) dragY.value = event.translationY;
        })
        .onEnd((event) => {
          if (event.translationY > coreChatLayout.dismissY || event.velocityY > 1100) {
            dragY.value = withTiming(event.translationY, { duration: 80 });
            runOnJS(close)();
            return;
          }
          dragY.value = withSpring(0, SHEET_SPRING);
        }),
    [close, coreChatLayout.dismissY, dismissKeyboard, dragY, open],
  );

  const cardWidth = Math.min(360, Math.max(300, windowWidth - 28));
  const dockClearance =
    (flushBottom ? 0 : insets.bottom) + DOCK_BOTTOM_GAP + DOCK_VISUAL_HEIGHT + 12;

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [0, 1, 1]),
    transform: [
      { translateY: dragY.value + interpolate(progress.value, [0, 1], [28, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
    ],
  }));

  if (!shown) return null;

  return (
    <View
      style={styles.root}
      pointerEvents={open ? 'box-none' : 'none'}
      accessibilityElementsHidden={!open}
    >
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <BlurView
          pointerEvents="none"
          intensity={coreChat.overlayGlassIntensity}
          tint={coreChat.overlayGlassTint}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: coreChat.overlayScrim }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss Core"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <KeyboardStickyView
        offset={{ closed: -dockClearance, opened: -coreChatLayout.keyboardGap }}
        style={styles.sticky}
      >
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[styles.cluster, { width: cardWidth }, sheetStyle]}
        >
          <GestureDetector gesture={pan}>
            <View
              style={[
                styles.cardShell,
                {
                  width: cardWidth,
                  height: coreChatLayout.compactHeight,
                  borderRadius: tokens.radius.dock,
                },
                shadows.elevated,
              ]}
            >
              <FrostedCard radius={tokens.radius.dock} style={styles.cardFill}>
                <View style={[styles.composer, coreChat.composer]}>
                  <SparklesIcon size={16} color={coreChat.muted} />
                  <TextInput
                    ref={inputRef}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Ask Core anything…"
                    placeholderTextColor={coreChat.muted}
                    autoFocus={false}
                    autoCorrect
                    autoCapitalize="sentences"
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically
                    returnKeyType="send"
                    editable={open}
                    onSubmitEditing={submit}
                    style={[styles.input, { color: coreChat.ink }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send"
                    disabled={!draft.trim()}
                    onPress={submit}
                    style={[
                      styles.send,
                      {
                        width: coreChatLayout.sendSize,
                        height: coreChatLayout.sendSize,
                        borderRadius: coreChatLayout.sendSize / 2,
                        backgroundColor: colors.primary,
                        opacity: draft.trim() ? 1 : tokens.opacity.disabled,
                      },
                    ]}
                  >
                    <ArrowUpIcon size={16} color={colors.primaryForeground} strokeWidth={2.4} />
                  </Pressable>
                </View>
              </FrostedCard>
            </View>
          </GestureDetector>
        </Animated.View>
      </KeyboardStickyView>
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
    ...StyleSheet.absoluteFill,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cluster: {
    alignSelf: 'center',
    alignItems: 'center',
    transformOrigin: 'bottom',
  },
  cardShell: {
    overflow: 'hidden',
  },
  cardFill: {
    flex: 1,
    width: '100%',
  },
  composer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
    marginVertical: 8,
    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: tokens.radius.full,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 8,
  },
  send: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
