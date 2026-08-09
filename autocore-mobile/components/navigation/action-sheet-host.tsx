import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';

import { GlassSheen } from '@/components/navigation/glass-sheen';
import { interpretAiPrompt } from '@/features/ai/interpret-ai-prompt';
import { useReducedMotion } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { useActionSheetStore } from '@/lib/shell/action-sheet-store';
import { useShellModel } from '@/lib/shell/use-shell-model';
import {
  DOCK_BOTTOM_GAP,
  DOCK_VISUAL_HEIGHT,
} from '@/lib/navigation/floating-tab-bar-inset';
import { withAlpha } from '@/theme/color-utils';
import { haptics } from '@/theme/haptics';
import { tokens } from '@/theme/tokens';

const QUICK_COUNT = 3;
const KEYBOARD_GAP = 10;

/** Drag distance past which the release dismisses instead of springing back. */
const DISMISS_DISTANCE = 72;
/** Flick velocity that dismisses regardless of distance. */
const DISMISS_VELOCITY = 700;
/** Resistance applied when dragging the sheet upward past its rest position. */
const RUBBER_BAND = 0.22;

/**
 * New composer — tall translucent capture card docked above the keyboard:
 * grab handle · multiline field · brand send orb pinned bottom-right ·
 * quick-action pill underneath. Absolute overlay inside the tab shell (no
 * Modal) so it always paints; KeyboardStickyView keeps it flush to the keyboard.
 */
export function ActionSheetHost() {
  const open = useActionSheetStore((s) => s.open);
  const dismiss = useActionSheetStore((s) => s.dismiss);
  const { actionItems } = useShellModel();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<TextInputType>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  /** Grabber drag offset and its "held" progress (drives the handle's size). */
  const drag = useSharedValue(0);
  const grabbing = useSharedValue(0);

  const quick = useMemo(() => actionItems.slice(0, QUICK_COUNT), [actionItems]);

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setBusy(false);
      drag.value = 0;
      grabbing.value = 0;
      return;
    }
    const id = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, [drag, grabbing, open]);

  const close = useCallback(() => {
    haptics.light();
    Keyboard.dismiss();
    dismiss();
  }, [dismiss]);

  const openHref = useCallback(
    (href?: string) => {
      if (!href) return;
      Keyboard.dismiss();
      dismiss();
      requestAnimationFrame(() => {
        router.push(href as Href);
      });
    },
    [dismiss, router],
  );

  const onSend = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    haptics.medium();
    setBusy(true);
    try {
      const blocks = await interpretAiPrompt(trimmed);
      let href: string | undefined;
      for (const block of blocks) {
        if (block.type === 'action' && block.primary) {
          href = block.href;
          break;
        }
      }
      if (!href) {
        for (const block of blocks) {
          if (block.type === 'confirmation' || block.type === 'action') {
            href = block.href;
            break;
          }
        }
      }
      openHref(href ?? `/search?q=${encodeURIComponent(trimmed)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, openHref, prompt]);

  // Search-field glass — thin material, barely tinted (not an opaque card).
  const fieldFill = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,120,128,0.12)';
  const border = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  const muted = isDark ? 'rgba(235,235,245,0.4)' : colors.mutedForeground;
  const ink = isDark ? '#ffffff' : colors.foreground;
  const grabberInk = isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.45)';

  const closedOffset =
    Math.max(insets.bottom, DOCK_BOTTOM_GAP) + DOCK_VISUAL_HEIGHT + DOCK_BOTTOM_GAP;

  const canSend = Boolean(prompt.trim()) && !busy;

  /**
   * Grabber drag — iOS sheet behaviour: the card tracks the finger downward,
   * resists upward, and either springs home or dismisses on release.
   */
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.value }],
  }));

  const grabberStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + grabbing.value * 0.5,
    transform: [{ scaleX: 1 + grabbing.value * 0.16 }],
  }));

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .onBegin(() => {
          grabbing.value = withTiming(1, { duration: 120 });
        })
        .onUpdate((event) => {
          drag.value =
            event.translationY > 0 ? event.translationY : event.translationY * RUBBER_BAND;
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
          if (shouldDismiss) {
            runOnJS(close)();
            return;
          }
          drag.value = withSpring(0, tokens.motion.springs.sheet);
        })
        .onFinalize(() => {
          grabbing.value = withTiming(0, { duration: 160 });
        }),
    [close, drag, grabbing],
  );

  const tapGesture = useMemo(
    () => Gesture.Tap().onEnd(() => runOnJS(close)()),
    [close],
  );

  const grabGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  const enterAnim = reducedMotion
    ? FadeIn.duration(120)
    : SlideInDown.springify()
        .damping(tokens.motion.springs.sheet.damping)
        .stiffness(tokens.motion.springs.sheet.stiffness)
        .mass(tokens.motion.springs.sheet.mass);

  const exitAnim = reducedMotion
    ? FadeOut.duration(100)
    : SlideOutDown.duration(tokens.motion.duration.normal);

  if (!open) return null;

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(140)}
      exiting={reducedMotion ? undefined : FadeOut.duration(120)}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={close}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: withAlpha('#000000', isDark ? 0.28 : 0.14) },
        ]}
      />

      {/*
        `KeyboardStickyView` applies `translateY = keyboardHeight + offset`, so
        offsets must be negative to lift the composer. Positive values pushed it
        down behind the dock and clipped the send orb off the bottom edge.
      */}
      <KeyboardStickyView
        offset={{ closed: -closedOffset, opened: -KEYBOARD_GAP }}
        style={styles.sticky}
      >
        <Animated.View entering={enterAnim} exiting={exitAnim}>
          <Animated.View style={[styles.dragWrap, dragStyle]}>
            <GestureDetector gesture={grabGesture}>
              <View
                accessibilityRole="adjustable"
                accessibilityLabel="Composer handle"
                accessibilityHint="Drag down or tap to close"
                style={styles.handleHit}
              >
                <Animated.View
                  style={[styles.handle, { backgroundColor: grabberInk }, grabberStyle]}
                />
              </View>
            </GestureDetector>

            <View style={[styles.field, { borderColor: border, backgroundColor: fieldFill }]}>
              <BlurView
                pointerEvents="none"
                intensity={isDark ? 48 : 60}
                tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                style={StyleSheet.absoluteFill}
              />
              <GlassSheen isDark={isDark} radius={FIELD_RADIUS} />
              <TextInput
                ref={inputRef}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="What's up?"
                placeholderTextColor={muted}
                multiline
                textAlignVertical="top"
                autoCorrect
                autoCapitalize="sentences"
                blurOnSubmit={false}
                editable={!busy}
                style={[styles.input, { color: ink }]}
              />
              {/* Footer row, not an absolute child — the orb can never drift. */}
              <View style={styles.fieldFooter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  disabled={!canSend}
                  onPress={() => void onSend()}
                  hitSlop={8}
                  style={[
                    styles.sendOrb,
                    { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.32 },
                  ]}
                >
                  <SymbolView name="arrow.up" size={17} tintColor="#ffffff" weight="bold" />
                </Pressable>
              </View>
            </View>

            {quick.length > 0 ? (
              <View style={styles.quickWrap}>
                <View
                  style={[styles.quickPill, { borderColor: border, backgroundColor: fieldFill }]}
                >
                  <BlurView
                    pointerEvents="none"
                    intensity={isDark ? 36 : 48}
                    tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                    style={StyleSheet.absoluteFill}
                  />
                  <GlassSheen isDark={isDark} radius={999} />
                  {quick.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                      onPress={() => {
                        haptics.selection();
                        openHref(item.href);
                      }}
                      hitSlop={6}
                      style={styles.quickHit}
                    >
                      {Platform.OS === 'ios' ? (
                        <SymbolView
                          name={item.sf as SFSymbol}
                          size={19}
                          tintColor={ink}
                          weight="regular"
                        />
                      ) : (
                        <View
                          style={{
                            width: 19,
                            height: 19,
                            borderRadius: 9.5,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: ink,
                          }}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </KeyboardStickyView>
    </Animated.View>
  );
}

const SEND_ORB = 36;
const FIELD_PAD = 14;
const FIELD_RADIUS = 22;

const styles = StyleSheet.create({
  sticky: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
  },
  dragWrap: {
    gap: 10,
  },
  /** Wide, tall target — iOS grabbers are easy to catch with a thumb. */
  handleHit: {
    alignSelf: 'center',
    paddingVertical: 9,
    paddingHorizontal: 56,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  field: {
    borderRadius: FIELD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: FIELD_PAD,
  },
  input: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '400',
    letterSpacing: -0.2,
    // Grows with the draft, then scrolls — never a fixed-height box.
    minHeight: 64,
    maxHeight: 168,
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
    paddingBottom: 0,
  },
  fieldFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sendOrb: {
    width: SEND_ORB,
    height: SEND_ORB,
    borderRadius: SEND_ORB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickWrap: {
    alignSelf: 'flex-start',
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  quickHit: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
