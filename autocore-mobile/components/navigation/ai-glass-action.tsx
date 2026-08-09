import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ArrowUpRightIcon, PlusIcon } from '@/assets/icons';
import { useReducedMotion, useTheme } from '@/hooks';
import { useDesignLanguage } from '@/hooks/use-design-language';
import { getGlassPalette, glassMotion, glassNav } from '@/theme/glass';
import { haptics, spacing } from '@/theme';

import { GlassSurface } from './glass-surface';
import { useAiGlassProgress } from './ai-glass-progress';

type AiGlassActionProps = {
  /**
   * The AI composer. Rendered inside the expanded glass — this component owns
   * the geometry of the transition and nothing about the composer's own
   * controls or behaviour. Without one, a plain prompt field stands in.
   */
  children?: ReactNode;
  /** Distance from the bottom of the screen to the button's bottom edge. */
  bottomOffset: number;
  onSubmit?: (text: string) => void;
};

/**
 * The global AI action: one piece of Liquid Glass that is a 66pt button until it
 * is pressed, and the composer's surface after.
 *
 * There is no button-out / modal-in cross-fade here. A single `progress` shared
 * value carries width, height, corner radius, position, content opacity and the
 * navigation's recede, so the composer is literally the same object grown from
 * the button's frame — pinned at its bottom-right corner, which is why it reads
 * as unfolding from under the glyph rather than appearing over it.
 */
export const AiGlassAction = memo(function AiGlassAction({
  children,
  bottomOffset,
  onSubmit,
}: AiGlassActionProps) {
  const { colors, scheme } = useTheme();
  const dl = useDesignLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useAiGlassProgress();
  const keyboard = useReanimatedKeyboardAnimation();
  const palette = getGlassPalette(scheme);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const press = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const expandedWidth = screenWidth - glassNav.barMarginX * 2;
  const setOpenState = useCallback((next: boolean) => setOpen(next), []);

  const openComposer = useCallback(() => {
    haptics.medium();
    setOpen(true);
    progress.value = reducedMotion ? 1 : withSpring(1, glassMotion.morph);
  }, [progress, reducedMotion]);

  const closeComposer = useCallback(() => {
    inputRef.current?.blur();
    if (reducedMotion) {
      progress.value = 0;
      setOpen(false);
      return;
    }
    progress.value = withSpring(0, glassMotion.morph, (finished) => {
      'worklet';
      if (finished) runOnJS(setOpenState)(false);
    });
  }, [progress, reducedMotion, setOpenState]);

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    onSubmit?.(text);
    setDraft('');
    closeComposer();
  }, [closeComposer, draft, onSubmit]);

  // Focus once the glass has committed to expanding, so the keyboard rides in on
  // its own native curve instead of fighting the morph.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(handle);
  }, [open]);

  /** Lift only as far as clearing the keyboard needs — never a fixed jump. */
  const keyboardLift = useDerivedValue(() => {
    const height = Math.abs(keyboard.height.value);
    return Math.max(0, height - bottomOffset + spacing[3]) * progress.value;
  }, [bottomOffset, keyboard.height, progress]);

  const surfaceStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [glassNav.aiSize, expandedWidth]),
    height: interpolate(progress.value, [0, 1], [glassNav.aiSize, glassNav.composerHeight]),
    bottom: bottomOffset + keyboardLift.value,
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.965]) }],
  }));

  const radiusStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [glassNav.aiRadius, glassNav.composerRadius]),
  }));

  const glyphStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.32], [1, 0], 'clamp'),
    transform: [
      { scale: interpolate(progress.value, [0, 0.32], [1, 0.9], 'clamp') },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.4, 1], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0.4, 1], [10, 0], 'clamp') }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, scrimStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close AI composer"
          onPress={closeComposer}
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]}
        />
      </Animated.View>

      <Animated.View
        style={[
          { position: 'absolute', right: glassNav.barMarginX, ...palette.controlShadow },
          surfaceStyle,
        ]}
      >
        <GlassSurface
          radius={glassNav.aiRadius}
          radiusStyle={radiusStyle}
          tone="control"
          style={StyleSheet.absoluteFill}
        >
          {open ? (
            <Animated.View
              style={[
                {
                  flex: 1,
                  padding: spacing[4],
                  paddingBottom: spacing[3],
                  gap: spacing[3],
                },
                bodyStyle,
              ]}
            >
              {children ?? (
                <>
                  <TextInput
                    ref={inputRef}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Ask AutoCore"
                    placeholderTextColor={palette.labelInactive}
                    returnKeyType="send"
                    multiline
                    onSubmitEditing={submit}
                    style={{
                      flex: 1,
                      fontFamily: dl.typeFamily.sans,
                      fontSize: 17,
                      lineHeight: 23,
                      color: palette.labelActive,
                      textAlignVertical: 'top',
                    }}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Send"
                      disabled={!draft.trim()}
                      onPress={submit}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.foreground,
                        opacity: draft.trim() ? 1 : 0.35,
                      }}
                    >
                      <ArrowUpRightIcon size={20} color={colors.background} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </>
              )}
            </Animated.View>
          ) : null}

          {/* The button itself stays put at the object's bottom-right corner. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI composer"
            accessibilityState={{ expanded: open }}
            pointerEvents={open ? 'none' : 'auto'}
            onPress={openComposer}
            onPressIn={() => {
              if (reducedMotion) return;
              press.value = withSpring(1, glassMotion.press);
            }}
            onPressOut={() => {
              press.value = withSpring(0, glassMotion.press);
            }}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: glassNav.aiSize,
              height: glassNav.aiSize,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View style={glyphStyle} pointerEvents="none">
              <PlusIcon size={glassNav.aiGlyphSize} color={palette.iconActive} strokeWidth={2} />
            </Animated.View>
          </Pressable>
        </GlassSurface>
      </Animated.View>
    </View>
  );
});
