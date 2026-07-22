import { forwardRef, useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';
import { form } from '@/theme/form';

import {
  INPUT_HEIGHT,
  createInputTextStyle,
  inputDisabledBackground,
  inputShellStyle,
  inputSurfaceBackground,
} from './tokens';

export type InputFieldTone = 'default' | 'error' | 'success';

export type InputFieldProps = Omit<TextInputProps, 'style'> & {
  tone?: InputFieldTone;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  fieldHeight?: number;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: 'default' | 'plain';
};

export const InputField = forwardRef<TextInput, InputFieldProps>(function InputField(
  {
    tone: toneProp,
    invalid,
    disabled,
    loading,
    fieldHeight = INPUT_HEIGHT,
    leftSlot,
    rightSlot,
    containerStyle,
    editable,
    onFocus,
    onBlur,
    textStyle: textStyleOverride,
    variant = 'default',
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
  const isPlain = variant === 'plain';
  const hasLeftSlot = Boolean(leftSlot);
  const hasRightSlot = Boolean(rightSlot) || loading;

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

  const paddingLeft = isPlain
    ? 0
    : hasLeftSlot
      ? form.controlPaddingHorizontalWithIcon
      : form.controlPaddingHorizontal;
  const paddingRight = isPlain
    ? 0
    : hasRightSlot
      ? 40
      : form.controlPaddingHorizontal;

  return (
    <Animated.View
      style={[
        {
          height: fieldHeight,
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isPlain
            ? 'transparent'
            : isDisabled
              ? inputDisabledBackground(scheme, colors)
              : inputSurfaceBackground(scheme, colors),
          opacity: isDisabled ? 0.5 : 1,
          borderWidth: isPlain ? 0 : inputShellStyle.borderWidth,
          borderRadius: isPlain ? 0 : inputShellStyle.borderRadius,
          paddingLeft,
          paddingRight,
          shadowColor: colors.ring,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 3,
          elevation: 0,
        },
        !isPlain ? animatedShellStyle : null,
        containerStyle,
      ]}
    >
      {hasLeftSlot ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: form.iconInsetStart,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {leftSlot}
        </View>
      ) : null}

      <View style={{ flex: 1, justifyContent: 'center', height: '100%', width: '100%' }}>
        <TextInput
          ref={ref}
          {...androidProps}
          {...props}
          editable={isEditable}
          placeholderTextColor={colors.mutedForeground}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[createInputTextStyle(colors.foreground), textStyleOverride, { width: '100%' }]}
        />
      </View>

      {loading ? (
        <View
          style={{
            position: 'absolute',
            right: form.controlPaddingHorizontal,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </View>
      ) : rightSlot ? (
        <View
          style={{
            position: 'absolute',
            right: 6,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
          }}
        >
          {rightSlot}
        </View>
      ) : null}
    </Animated.View>
  );
});
