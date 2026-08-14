import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ArrowRightIcon, CheckIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, tokens } from '@/theme';

/** Lifecycle of the sheet's primary action. */
export type CoSubmitPhase = 'idle' | 'submitting' | 'success';

const ROW_HEIGHT = tokens.control.heightLg; // 48 — the pill sets the row
const PRESS_SCALE = 0.97;
/** Reserved side space is capped so the title keeps a usable column on 320pt. */
const MAX_SIDE_RATIO = 0.38;

type CoSheetHeaderProps = {
  title: string;
  onCancel: () => void;
  cancelLabel?: string;
  /** Omitted for read-only variants — the row then carries Cancel and the title only. */
  onSubmit?: () => void;
  submitLabel?: string;
  successLabel?: string;
  canSubmit?: boolean;
  phase?: CoSubmitPhase;
  /** Hairline appears once content passes under the header, as on iOS. */
  scrolled?: boolean;
};

/**
 * Sheet chrome: Cancel · title · primary action.
 *
 * Built rather than delegated to the native stack header for two reasons the
 * native bar cannot satisfy — a 48pt pill does not fit a 44pt navigation bar,
 * and the native bar re-centres its title against the available space, so a
 * wide right action visibly shifts it. Here the title is its own absolutely
 * positioned layer inset symmetrically by the wider of the two sides, which
 * keeps it on the screen's centre line whatever the actions measure.
 */
export function CoSheetHeader({
  title,
  onCancel,
  cancelLabel = 'Cancel',
  onSubmit,
  submitLabel = 'Add',
  successLabel = 'Added',
  canSubmit = false,
  phase = 'idle',
  scrolled = false,
}: CoSheetHeaderProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const [rowWidth, setRowWidth] = useState(0);
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);
  /** Width the pill settles at when idle — held through the spinner state. */
  const [restWidth, setRestWidth] = useState(0);
  const [cancelPressed, setCancelPressed] = useState(false);

  const scale = useSharedValue(1);
  /** 0 while the write is in flight, 1 once it is confirmed. */
  const confirm = useSharedValue(0);

  const onCancelLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setLeftWidth((current) => (current === next ? current : next));
  }, []);

  /**
   * Loading renders the spinner alone, which would collapse the pill and slide
   * the title's counterweight. Only the idle pill defines the resting width, so
   * the busy states inherit it and nothing moves.
   */
  const onActionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next = Math.round(event.nativeEvent.layout.width);
      setRightWidth((current) => (current === next ? current : next));
      if (phase === 'idle' && next > 0) {
        setRestWidth((current) => (current === next ? current : next));
      }
    },
    [phase],
  );

  const onRowLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setRowWidth((current) => (current === next ? current : next));
  }, []);

  const submitting = phase === 'submitting';
  const success = phase === 'success';
  const busy = submitting || success;
  /**
   * Only the idle-and-incomplete pill takes Button's disabled surface. Through
   * submitting and success it keeps the accent fill — the action is in flight,
   * not unavailable, and dropping it to grey would throw the hierarchy away at
   * exactly the moment the user is watching it. Re-entry is blocked in the
   * handler instead, and `accessibilityState` still reports it as busy.
   */
  const inert = phase === 'idle' && !canSubmit;
  const accented = Boolean(onSubmit) && !inert;

  /**
   * The confirmation lands rather than cuts: the pill gives one short pulse
   * while the tick and label scale up into the space the spinner just left.
   * Both run off the same state change, so they read as a single beat.
   */
  useEffect(() => {
    if (!success) {
      confirm.value = 0;
      return;
    }
    if (reduced) {
      confirm.value = 1;
      return;
    }
    confirm.value = withSpring(1, { damping: 15, stiffness: 260, mass: 0.7 });
    scale.value = withSequence(
      withTiming(1.04, { duration: 110, easing: autocoreEase }),
      withSpring(1, tokens.motion.springs.press),
    );
  }, [confirm, reduced, scale, success]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const confirmStyle = useAnimatedStyle(() => ({
    opacity: confirm.value,
    transform: [{ scale: 0.82 + confirm.value * 0.18 }],
  }));

  const onPressIn = useCallback(() => {
    if (reduced || busy) return;
    scale.value = withTiming(PRESS_SCALE, { duration: 90 });
  }, [busy, reduced, scale]);

  const onPressOut = useCallback(() => {
    if (reduced) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(1, tokens.motion.springs.press);
  }, [reduced, scale]);

  /**
   * Submitting disables the Pressable in the same tick as the press, so
   * `onPressOut` never arrives — release the scale on the way into the action.
   */
  const handleSubmit = useCallback(() => {
    // A second tap while the write is in flight would create a duplicate entry.
    if (phase !== 'idle') return;
    scale.value = withSpring(1, tokens.motion.springs.press);
    onSubmit?.();
  }, [onSubmit, phase, scale]);

  /**
   * Symmetric inset keeps the title on the row's centre line rather than
   * centring it in the gap between the actions.
   *
   * It is measured against the *resting* pill, never the live one: "Added"
   * runs wider than "Add", and reserving space for the transient state would
   * clip the title for the two thirds of a second the confirmation is up.
   */
  const actionWidth = restWidth > 0 ? restWidth : rightWidth;
  const rawSide = Math.max(leftWidth, actionWidth) + tokens.space.inline;
  const maxSide = rowWidth > 0 ? rowWidth * MAX_SIDE_RATIO : rawSide;
  const sideInset = Math.min(rawSide, maxSide);

  /** Icon rides the label's colour, which Button resolves from the disabled surface. */
  const actionInk = accented ? colors.primaryForeground : colors.mutedForeground;

  return (
    <View
      style={{
        // Clears the sheet's grabber, which UIKit draws in the first ~12pt.
        paddingTop: tokens.space[4],
        paddingBottom: tokens.space[3],
        paddingHorizontal: tokens.space.screenX,
        backgroundColor: colors.background,
        borderBottomWidth: scrolled ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ minHeight: ROW_HEIGHT, justifyContent: 'center' }} onLayout={onRowLayout}>
        <View
          // Style form, not the prop: RN 0.85 / New Arch treats the legacy
          // `pointerEvents` prop as deprecated, and this layer spans the row
          // before the sides are measured — if it ever swallowed touches it
          // would take Cancel and Add with it.
          style={{
            position: 'absolute',
            left: sideInset,
            right: sideInset,
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            variant="headline"
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            // No adjustsFontSizeToFit: RN ignores minimumFontScale here and
            // drops the title to ~11pt, which reads worse than an ellipsis.
            maxFontSizeMultiplier={1.2}
            style={{ color: colors.foreground, textAlign: 'center' }}
          >
            {title}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View onLayout={onCancelLayout}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
              onPressIn={() => setCancelPressed(true)}
              onPressOut={() => setCancelPressed(false)}
              onPress={onCancel}
              style={{
                minHeight: tokens.control.hitTarget,
                justifyContent: 'center',
                // The pill owns the right edge; Cancel sits flush to the left.
                paddingRight: tokens.space.inline,
                opacity: cancelPressed ? 0.45 : 1,
              }}
            >
              <Text
                variant="body"
                maxFontSizeMultiplier={1.2}
                style={{ color: colors.mutedForeground }}
              >
                {cancelLabel}
              </Text>
            </Pressable>
          </View>

          {onSubmit ? (
            <Animated.View onLayout={onActionLayout} style={pressStyle}>
              <Button
                inline
                variant="default"
                size="lg"
                shape="pill"
                // The submit flow owns its own haptic sequence; the built-in
                // press tick would fire a second light impact on top of it.
                haptic={false}
                disabled={inert}
                accessibilityLabel={success ? successLabel : submitLabel}
                accessibilityState={{ disabled: inert, busy: submitting }}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={handleSubmit}
                style={[
                  { paddingHorizontal: 16 },
                  // The inert fill sits a shade off the sheet background, so a
                  // hairline keeps the shape legible without implying it is live.
                  inert
                    ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }
                    : null,
                  restWidth > 0 ? { minWidth: restWidth } : null,
                ]}
                rightIcon={
                  submitting || success ? undefined : (
                    <ArrowRightIcon size={16} color={actionInk} strokeWidth={2.4} />
                  )
                }
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : success ? (
                  <Animated.View
                    style={[
                      { flexDirection: 'row', alignItems: 'center', gap: tokens.space.inline - 2 },
                      confirmStyle,
                    ]}
                  >
                    <CheckIcon size={17} color={actionInk} strokeWidth={2.6} />
                    <Text
                      variant="button"
                      maxFontSizeMultiplier={1.2}
                      style={{ color: actionInk, fontWeight: '600' }}
                    >
                      {successLabel}
                    </Text>
                  </Animated.View>
                ) : (
                  submitLabel
                )}
              </Button>
            </Animated.View>
          ) : (
            <View onLayout={onActionLayout} style={{ minWidth: tokens.control.hitTarget }} />
          )}
        </View>
      </View>
    </View>
  );
}
