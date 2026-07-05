import { forwardRef, useCallback } from 'react';
import { Platform, TextInput, type TextInputProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';
import { form } from '@/theme/form';

import type { InputFieldTone } from './input-field';
import {
  INPUT_MULTILINE_MIN_HEIGHT,
  createMultilineTextStyle,
  inputDisabledBackground,
  inputShellStyle,
  inputSurfaceBackground,
} from './tokens';

export type TextAreaProps = Omit<TextInputProps, 'multiline' | 'style'> & {
  tone?: InputFieldTone;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  rows?: number;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export const TextArea = forwardRef<TextInput, TextAreaProps>(function TextArea(
  {
    tone: toneProp,
    invalid,
    disabled,
    loading,
    rows = 4,
    containerStyle,
    editable,
    onFocus,
    onBlur,
    textStyle,
    ...props
  },
  ref,
) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const focused = useSharedValue(0);

  const tone: InputFieldTone = toneProp ?? (invalid ? 'error' : 'default');
  const isDisabled = disabled || loading;
  const isEditable = editable !== false && !isDisabled;

  const minHeight = Math.max(INPUT_MULTILINE_MIN_HEIGHT, rows * form.controlLineHeight + form.controlPaddingVertical * 2 + 16);

  const restBorderColor =
    tone === 'error'
      ? withAlpha(colors.destructive, scheme === 'dark' ? 0.5 : 1)
      : tone === 'success'
        ? withAlpha(colors.success, 0.55)
        : colors.input;

  const focusBorderColor = tone === 'error' ? colors.destructive : colors.ring;

  const animatedShellStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [restBorderColor, focusBorderColor]),
    shadowOpacity: focused.value * 0.35,
  }));

  const setFocused = useCallback(
    (next: boolean) => {
      focused.value = reduced
        ? next
          ? 1
          : 0
        : withTiming(next ? 1 : 0, { duration: form.focusDurationMs });
    },
    [focused, reduced],
  );

  const androidProps =
    Platform.OS === 'android'
      ? ({ includeFontPadding: false } as Pick<TextInputProps, never> & { includeFontPadding: boolean })
      : {};

  return (
    <Animated.View
      style={[
        {
          minHeight,
          width: '100%',
          backgroundColor: isDisabled
            ? inputDisabledBackground(scheme, colors)
            : inputSurfaceBackground(scheme, colors),
          opacity: isDisabled ? 0.5 : 1,
          paddingVertical: 8,
          paddingHorizontal: form.controlPaddingHorizontal,
          borderRadius: inputShellStyle.borderRadius,
          borderWidth: inputShellStyle.borderWidth,
          shadowColor: colors.ring,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 3,
          elevation: 0,
        },
        animatedShellStyle,
        containerStyle,
      ]}
    >
      <TextInput
        ref={ref}
        multiline
        editable={isEditable}
        placeholderTextColor={colors.mutedForeground}
        textAlignVertical="top"
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[createMultilineTextStyle(colors.foreground), textStyle]}
        {...androidProps}
        {...props}
      />
    </Animated.View>
  );
});
