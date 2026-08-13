import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FormField, InputField, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';
import { haptics, spacing, tokens } from '@/theme';

const KEYBOARD_GAP = 10;
const DISMISS_DISTANCE = 72;
const DISMISS_VELOCITY = 700;
const RUBBER_BAND = 0.22;
const DISMISS_SLIDE = 420;
/**
 * Slide-out is 180ms, but the iOS keyboard-hide transition runs ~250ms and
 * KeyboardStickyView must not be told to stop mid-flight. Wait for the slower
 * of the two before flipping state.
 */
const CLOSE_SETTLE_MS = 320;
const SHEET_SPRING = {
  damping: tokens.motion.springs.sheet.damping,
  stiffness: tokens.motion.springs.sheet.stiffness,
  mass: tokens.motion.springs.sheet.mass,
} as const;

export type IntakeCreateIdentityDraft = {
  serialCode: string;
  brandName: string;
  engineCode: string;
};

export type IntakeCreateSerialSheetRef = {
  present: (options?: {
    mode?: 'create' | 'edit';
    jobId?: string;
    identity?: IntakeCreateIdentityDraft;
  }) => void;
  dismiss: () => void;
};

type IntakeCreateSerialSheetProps = {
  loading?: boolean;
  onSubmit: (
    identity: IntakeCreateIdentityDraft,
    meta: { mode: 'create' } | { mode: 'edit'; jobId: string },
  ) => void | Promise<void>;
};

/**
 * New-engine composer. Absolute overlay (not RN Modal) so KeyboardStickyView
 * stays under KeyboardProvider.
 *
 * Closing must never unmount this subtree while something is still animating.
 * Two separate races used to crash here:
 *
 *  1. Reanimated layout `exiting` running while KeyboardStickyView is mounted.
 *  2. Tearing the subtree down from inside a `withTiming` completion callback —
 *     `runOnJS(setOpen(false))` destroys the views whose `useAnimatedStyle`
 *     mappings Reanimated is still finalising, and the iOS keyboard-hide
 *     animation (~250ms) outlives the 180ms slide-out, so KeyboardStickyView
 *     was being unmounted mid keyboard transition.
 *
 * So the overlay now stays mounted for the life of the screen. Visibility is
 * purely shared values plus `pointerEvents`; nothing mounts or unmounts on the
 * close path, which removes the race rather than narrowing its window.
 */
export const IntakeCreateSerialSheet = forwardRef<
  IntakeCreateSerialSheetRef,
  IntakeCreateSerialSheetProps
>(function IntakeCreateSerialSheet({ loading = false, onSubmit }, ref) {
  const { colors, isDark, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const serialRef = useRef<TextInputType>(null);
  const brandRef = useRef<TextInputType>(null);
  const engineRef = useRef<TextInputType>(null);
  const closingRef = useRef(false);
  /** Mirrors `open` so `dismiss` can bail early without re-identifying. */
  const openRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [serialDraft, setSerialDraft] = useState('');
  const [brandDraft, setBrandDraft] = useState('');
  const [engineDraft, setEngineDraft] = useState('');

  const drag = useSharedValue(DISMISS_SLIDE);
  const grabbing = useSharedValue(0);
  const backdrop = useSharedValue(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearDrafts = useCallback(() => {
    setSerialDraft('');
    setBrandDraft('');
    setEngineDraft('');
    setMode('create');
    setEditJobId(null);
  }, []);

  /**
   * Never `runOnJS(Keyboard.dismiss)`. That reads `.dismiss` off the `Keyboard`
   * module *inside* the worklet, and the module object cannot cross into the UI
   * runtime — Worklets throws "Trying to access property `dismiss` of an object
   * which cannot be sent to the UI runtime" the moment the gesture begins.
   * Wrapping it in a plain local function gives the worklet something it can
   * capture.
   */
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  /**
   * Runs on a plain JS timer once the slide-out and the keyboard have both had
   * time to settle. It only flips React state — the shared values are reset by
   * `present`, so nothing writes to a view that is going away.
   */
  const finishClose = useCallback(() => {
    closeTimerRef.current = null;
    closingRef.current = false;
    openRef.current = false;
    setOpen(false);
    clearDrafts();
  }, [clearDrafts]);

  const dismiss = useCallback(() => {
    if (!openRef.current || closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    backdrop.value = withTiming(0, { duration: 140 });
    drag.value = withTiming(DISMISS_SLIDE, { duration: 180 });
    clearCloseTimer();
    closeTimerRef.current = setTimeout(finishClose, CLOSE_SETTLE_MS);
  }, [backdrop, clearCloseTimer, drag, finishClose]);

  useImperativeHandle(
    ref,
    () => ({
      present: (options) => {
        // Cancel any close still in flight so a fast re-open cannot be shut by
        // the previous dismissal's timer.
        clearCloseTimer();
        closingRef.current = false;
        const nextMode = options?.mode === 'edit' ? 'edit' : 'create';
        setMode(nextMode);
        setEditJobId(nextMode === 'edit' ? (options?.jobId ?? null) : null);
        setSerialDraft(options?.identity?.serialCode ?? '');
        setBrandDraft(options?.identity?.brandName ?? '');
        setEngineDraft(options?.identity?.engineCode ?? '');
        drag.value = DISMISS_SLIDE;
        backdrop.value = 0;
        grabbing.value = 0;
        openRef.current = true;
        setOpen(true);
        requestAnimationFrame(() => {
          backdrop.value = withTiming(1, { duration: 160 });
          drag.value = withSpring(0, SHEET_SPRING);
        });
      },
      dismiss,
    }),
    [backdrop, clearCloseTimer, dismiss, drag, grabbing],
  );

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => serialRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [open]);

  // Android hardware back closes the sheet instead of leaving the screen.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading) return true;
      dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [dismiss, loading, open]);

  const submit = useCallback(async () => {
    const serialCode = serialDraft.trim().toUpperCase();
    if (!serialCode || loading || closingRef.current) return;
    if (mode === 'edit' && !editJobId) return;
    const identity: IntakeCreateIdentityDraft = {
      serialCode,
      brandName: brandDraft.trim(),
      engineCode: engineDraft.trim().toUpperCase(),
    };
    Keyboard.dismiss();
    await onSubmit(
      identity,
      mode === 'edit' && editJobId
        ? { mode: 'edit', jobId: editJobId }
        : { mode: 'create' },
    );
  }, [brandDraft, editJobId, engineDraft, loading, mode, onSubmit, serialDraft]);

  const closeFromUi = useCallback(() => {
    if (loading || closingRef.current) return;
    haptics.light();
    dismiss();
  }, [dismiss, loading]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!loading && open)
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .onBegin(() => {
          grabbing.value = withTiming(1, { duration: 120 });
          runOnJS(dismissKeyboard)();
        })
        .onUpdate((event) => {
          drag.value =
            event.translationY > 0 ? event.translationY : event.translationY * RUBBER_BAND;
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
          if (shouldDismiss) {
            runOnJS(closeFromUi)();
            return;
          }
          drag.value = withSpring(0, SHEET_SPRING);
        })
        .onFinalize(() => {
          grabbing.value = withTiming(0, { duration: 160 });
        }),
    [closeFromUi, dismissKeyboard, drag, grabbing, loading, open],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!loading && open)
        // `success` guards against a cancelled tap (finger slid off) closing.
        .onEnd((_event, success) => {
          if (success) runOnJS(closeFromUi)();
        }),
    [closeFromUi, loading, open],
  );

  const grabGesture = useMemo(
    () => Gesture.Exclusive(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const grabberStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + grabbing.value * 0.5,
    transform: [{ scaleX: 1 + grabbing.value * 0.16 }],
  }));

  const closedOffset = Math.max(insets.bottom, spacing[3]) + spacing[2];
  const canSubmit = open && serialDraft.trim().length > 0 && !loading && !closingRef.current;

  // Never unmounted — see the note on the component. When closed the overlay is
  // parked off-screen at zero opacity, invisible to touch and to VoiceOver.
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.host]}
      pointerEvents={open ? 'box-none' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          disabled={loading || !open}
          onPress={closeFromUi}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: withAlpha('#000000', isDark ? 0.42 : 0.22) },
          ]}
        />
      </Animated.View>

      <KeyboardStickyView
        offset={{ closed: -closedOffset, opened: -KEYBOARD_GAP }}
        style={styles.sticky}
      >
        <Animated.View
          style={[
            styles.card,
            shadows.soft,
            dragStyle,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <GestureDetector gesture={grabGesture}>
            <View
              accessibilityRole="adjustable"
              accessibilityLabel="Close sheet"
              accessibilityHint="Drag down or tap to close"
              style={styles.grabZone}
            >
              <Animated.View
                style={[
                  styles.handle,
                  { backgroundColor: colors.mutedForeground },
                  grabberStyle,
                ]}
              />
              <View style={{ gap: spacing[1], alignSelf: 'stretch' }}>
                <Text
                  variant="heading"
                  style={{
                    color: colors.foreground,
                    fontWeight: '800',
                    letterSpacing: -0.3,
                  }}
                >
                  {mode === 'edit' ? 'Edit engine' : 'New engine'}
                </Text>
                <Text variant="caption" style={{ color: colors.mutedForeground }}>
                  {mode === 'edit'
                    ? 'Update serial, brand, or engine code'
                    : 'Serial required · brand and code optional'}
                </Text>
              </View>
            </View>
          </GestureDetector>

          <FormField label="Engine serial" required>
            <InputField
              ref={serialRef}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              editable={!loading && open}
              value={serialDraft}
              onChangeText={setSerialDraft}
              placeholder="UF398539"
              returnKeyType="next"
              blurOnSubmit={false}
              accessibilityLabel="Engine serial"
              textStyle={styles.serialText}
              onSubmitEditing={() => brandRef.current?.focus()}
            />
          </FormField>

          <View style={styles.row}>
            <View style={styles.half}>
              <FormField label="Brand">
                <InputField
                  ref={brandRef}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading && open}
                  value={brandDraft}
                  onChangeText={setBrandDraft}
                  placeholder="Toyota"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  accessibilityLabel="Brand"
                  onSubmitEditing={() => engineRef.current?.focus()}
                />
              </FormField>
            </View>
            <View style={styles.half}>
              <FormField label="Engine code">
                <InputField
                  ref={engineRef}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  spellCheck={false}
                  editable={!loading && open}
                  value={engineDraft}
                  onChangeText={setEngineDraft}
                  placeholder="2AZ-FE"
                  returnKeyType="go"
                  blurOnSubmit
                  accessibilityLabel="Engine code"
                  onSubmitEditing={() => void submit()}
                />
              </FormField>
            </View>
          </View>

          <Button
            size="xl"
            loading={loading}
            disabled={!canSubmit}
            onPress={() => void submit()}
          >
            {mode === 'edit' ? 'Save changes' : 'Open camera'}
          </Button>
        </Animated.View>
      </KeyboardStickyView>
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    zIndex: 100,
    elevation: 100,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    marginHorizontal: spacing[3],
    borderRadius: tokens.radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  grabZone: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing[2],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  serialText: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
});
