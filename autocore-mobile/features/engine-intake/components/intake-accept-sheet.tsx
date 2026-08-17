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
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInput as TextInputType,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  isDocumentationChecklistReady,
  MOTOR_QUALITY_GRADE_OPTIONS,
  type EngineIntakeJob,
  type MotorQualityGrade,
} from '@autocore/engine-intake';

import { Button, FormField, InputField, Text, TextArea } from '@/components/ui';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';
import { haptics, spacing, tokens } from '@/theme';

const KEYBOARD_GAP = 10;
const DISMISS_DISTANCE = 72;
const DISMISS_VELOCITY = 700;
const RUBBER_BAND = 0.22;
const CLOSE_SETTLE_MS = 320;
const PHOTO_TILE = 72;
const SHEET_SPRING = {
  damping: tokens.motion.springs.sheet.damping,
  stiffness: tokens.motion.springs.sheet.stiffness,
  mass: tokens.motion.springs.sheet.mass,
} as const;

export type IntakeAcceptDraft = {
  serialCode: string;
  brandName: string;
  engineCode: string;
  quality: MotorQualityGrade;
  note: string;
};

export type IntakeAcceptSheetRef = {
  present: (job: EngineIntakeJob) => void;
  dismiss: () => void;
};

type IntakeAcceptSheetProps = {
  loading?: boolean;
  photoUrls?: string[];
  onOpenPhoto?: (index: number) => void;
  onDismiss: () => void;
  onSubmit: (draft: IntakeAcceptDraft) => void | Promise<void>;
};

function gradeTone(value: MotorQualityGrade, colors: ReturnType<typeof useTheme>['colors']) {
  if (value === '2') {
    return {
      fill: colors.successSubtle,
      text: colors.successOnSubtle,
      border: colors.successBorder,
      selectedFill: colors.success,
      selectedText: colors.successForeground,
    };
  }
  if (value === '3') {
    return {
      fill: colors.dangerSubtle,
      text: colors.dangerOnSubtle,
      border: colors.dangerBorder,
      selectedFill: colors.danger,
      selectedText: colors.dangerForeground,
    };
  }
  return {
    fill: colors.primarySubtle,
    text: colors.primaryOnSubtle,
    border: colors.primaryBorder,
    selectedFill: colors.primary,
    selectedText: colors.primaryForeground,
  };
}

export const IntakeAcceptSheet = forwardRef<IntakeAcceptSheetRef, IntakeAcceptSheetProps>(
  function IntakeAcceptSheet(
    { loading = false, photoUrls = [], onOpenPhoto, onDismiss, onSubmit },
    ref,
  ) {
    const { colors, isDark, shadows } = useTheme();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const serialRef = useRef<TextInputType>(null);
    const closingRef = useRef(false);
    const openRef = useRef(false);
    const approvedRef = useRef(false);

    const [open, setOpen] = useState(false);
    const [job, setJob] = useState<EngineIntakeJob | null>(null);
    const [serialDraft, setSerialDraft] = useState('');
    const [brandDraft, setBrandDraft] = useState('');
    const [engineDraft, setEngineDraft] = useState('');
    const [quality, setQuality] = useState<MotorQualityGrade | null>(null);
    const [noteDraft, setNoteDraft] = useState('');

    const hiddenY = Math.max(windowHeight, 1);
    const drag = useSharedValue(hiddenY);
    const grabbing = useSharedValue(0);
    const backdrop = useSharedValue(0);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const releaseNeedsOverride = Boolean(
      job && !isDocumentationChecklistReady(job.documentationChecklist),
    );
    const hasBlockingFlags = Boolean(job && job.blockingAiFlags.length > 0);
    const noteRequired = releaseNeedsOverride || hasBlockingFlags;
    const photoCount = Math.max(job?.progress.capturedCount ?? 0, photoUrls.length);

    const clearCloseTimer = useCallback(() => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }, []);

    const clearDrafts = useCallback(() => {
      setJob(null);
      setSerialDraft('');
      setBrandDraft('');
      setEngineDraft('');
      setQuality(null);
      setNoteDraft('');
      approvedRef.current = false;
    }, []);

    const dismissKeyboard = useCallback(() => {
      Keyboard.dismiss();
    }, []);

    const finishClose = useCallback(() => {
      closeTimerRef.current = null;
      closingRef.current = false;
      openRef.current = false;
      const skipParent = approvedRef.current;
      setOpen(false);
      clearDrafts();
      if (!skipParent) onDismiss();
    }, [clearDrafts, onDismiss]);

    const dismiss = useCallback(() => {
      if (!openRef.current || closingRef.current) return;
      closingRef.current = true;
      Keyboard.dismiss();
      backdrop.value = withTiming(0, { duration: 140 });
      drag.value = withTiming(hiddenY, { duration: 180 });
      clearCloseTimer();
      closeTimerRef.current = setTimeout(finishClose, CLOSE_SETTLE_MS);
    }, [backdrop, clearCloseTimer, drag, finishClose, hiddenY]);

    const dismissApproved = useCallback(() => {
      approvedRef.current = true;
      dismiss();
    }, [dismiss]);

    useImperativeHandle(
      ref,
      () => ({
        present: (nextJob) => {
          clearCloseTimer();
          closingRef.current = false;
          approvedRef.current = false;
          setJob(nextJob);
          setSerialDraft(nextJob.expectedIdentity.serialCode ?? '');
          setBrandDraft(nextJob.expectedIdentity.brandName ?? '');
          setEngineDraft(nextJob.expectedIdentity.engineCode ?? '');
          setQuality(null);
          setNoteDraft('');
          drag.value = hiddenY;
          backdrop.value = 0;
          grabbing.value = 0;
          openRef.current = true;
          setOpen(true);
          requestAnimationFrame(() => {
            backdrop.value = withTiming(1, { duration: 160 });
            drag.value = withSpring(0, SHEET_SPRING);
          });
        },
        dismiss: dismissApproved,
      }),
      [backdrop, clearCloseTimer, dismissApproved, drag, grabbing, hiddenY],
    );

    useEffect(() => clearCloseTimer, [clearCloseTimer]);

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
      if (!serialCode || !quality || loading || closingRef.current) return;
      if (noteRequired && !noteDraft.trim()) return;
      if (photoCount < 1) return;
      Keyboard.dismiss();
      await onSubmit({
        serialCode,
        brandName: brandDraft.trim(),
        engineCode: engineDraft.trim().toUpperCase(),
        quality,
        note: noteDraft.trim(),
      });
    }, [
      brandDraft,
      engineDraft,
      loading,
      noteDraft,
      noteRequired,
      onSubmit,
      photoCount,
      quality,
      serialDraft,
    ]);

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
    const canSubmit =
      open &&
      serialDraft.trim().length > 0 &&
      quality !== null &&
      photoCount >= 1 &&
      (!noteRequired || noteDraft.trim().length > 0) &&
      !loading &&
      !closingRef.current;
    const maxCardHeight = Math.round(windowHeight * 0.88);

    return (
      <View
        style={[StyleSheet.absoluteFill, styles.host, !open && styles.hidden]}
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
                maxHeight: maxCardHeight,
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
                    Release to Motors Grid
                  </Text>
                  <Text variant="caption" style={{ color: colors.mutedForeground }}>
                    {noteRequired
                      ? 'Sale checklist still open. Confirm identity, set quality, and add a note.'
                      : 'Confirm serial, set quality, and release into the Excel grid.'}
                  </Text>
                </View>
              </View>
            </GestureDetector>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              {photoUrls.length > 0 ? (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photos}
                >
                  {photoUrls.map((url, index) => (
                    <Pressable
                      key={`${url}-${index}`}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={`Photo ${index + 1}`}
                      onPress={() => {
                        haptics.selection();
                        onOpenPhoto?.(index);
                      }}
                      style={[
                        styles.photo,
                        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      ]}
                    >
                      <Image
                        source={{ uri: url }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={120}
                        alt=""
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text variant="caption" style={{ color: colors.mutedForeground }}>
                  {photoCount > 0
                    ? `${photoCount} photo${photoCount === 1 ? '' : 's'}`
                    : 'No photos yet — add photos before confirming.'}
                </Text>
              )}

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
                  accessibilityLabel="Engine serial"
                  textStyle={styles.serialText}
                />
              </FormField>

              <View style={styles.row}>
                <View style={styles.half}>
                  <FormField label="Brand">
                    <InputField
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!loading && open}
                      value={brandDraft}
                      onChangeText={setBrandDraft}
                      placeholder="Toyota"
                      accessibilityLabel="Brand"
                    />
                  </FormField>
                </View>
                <View style={styles.half}>
                  <FormField label="Engine code">
                    <InputField
                      autoCapitalize="characters"
                      autoCorrect={false}
                      spellCheck={false}
                      editable={!loading && open}
                      value={engineDraft}
                      onChangeText={setEngineDraft}
                      placeholder="2AZ-FE"
                      accessibilityLabel="Engine code"
                    />
                  </FormField>
                </View>
              </View>

              <FormField label="Quality" required>
                <View style={styles.grades}>
                  {MOTOR_QUALITY_GRADE_OPTIONS.map((option) => {
                    const selected = quality === option.value;
                    const tone = gradeTone(option.value, colors);
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Quality ${option.value} ${option.label}`}
                        disabled={loading || !open}
                        onPress={() => {
                          haptics.selection();
                          setQuality(option.value);
                        }}
                        style={[
                          styles.grade,
                          {
                            backgroundColor: selected ? tone.selectedFill : tone.fill,
                            borderColor: tone.border,
                          },
                        ]}
                      >
                        <Text
                          variant="title"
                          style={{
                            color: selected ? tone.selectedText : tone.text,
                            fontWeight: '800',
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {option.value}
                        </Text>
                        <Text
                          variant="caption"
                          style={{
                            color: selected ? tone.selectedText : tone.text,
                            fontWeight: '700',
                          }}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FormField>

              {noteRequired ? (
                <FormField
                  label={hasBlockingFlags ? 'Override note' : 'Verification note'}
                  required
                >
                  <TextArea
                    editable={!loading && open}
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    placeholder={
                      hasBlockingFlags
                        ? 'Why is this evidence safe to approve?'
                        : 'Manager override for an incomplete sale checklist'
                    }
                    rows={3}
                    accessibilityLabel="Verification note"
                  />
                </FormField>
              ) : null}
            </ScrollView>

            <Button
              size="xl"
              loading={loading}
              disabled={!canSubmit}
              onPress={() => void submit()}
            >
              Confirm
            </Button>
          </Animated.View>
        </KeyboardStickyView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  host: {
    zIndex: 110,
    elevation: 110,
  },
  hidden: {
    opacity: 0,
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
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing[3],
    paddingBottom: spacing[1],
  },
  photos: {
    gap: spacing[2],
  },
  photo: {
    width: PHOTO_TILE,
    height: PHOTO_TILE,
    borderRadius: tokens.radius.control,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
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
  grades: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  grade: {
    flex: 1,
    minHeight: tokens.control.heightXl,
    borderRadius: tokens.radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing[2],
  },
});
