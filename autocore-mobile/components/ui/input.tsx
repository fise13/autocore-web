import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, View, type TextInput } from 'react-native';

import { FormHelper, FormLabel } from '@/components/ui/form';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { form, haptics } from '@/theme';

import { InputField, type InputFieldProps } from './input/input-field';
import { INPUT_HEIGHT, INPUT_HEIGHT_LG } from './input/tokens';
import { TextArea, type TextAreaProps } from './input/text-area';

export type InputProps = Omit<InputFieldProps, 'tone' | 'leftSlot' | 'rightSlot'> & {
  label?: string;
  labelVariant?: 'label' | 'caption';
  helperText?: string;
  error?: string | boolean;
  success?: string | boolean;
  /** @deprecated Use `error` instead. */
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPasswordToggle?: boolean;
  multiline?: boolean;
  rows?: number;
  size?: 'default' | 'lg';
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    labelVariant = 'label',
    helperText,
    error,
    success,
    invalid,
    leftIcon,
    rightIcon,
    loading,
    disabled,
    secureTextEntry,
    showPasswordToggle = true,
    multiline,
    rows,
    size = 'default',
    fieldHeight,
    accessibilityLabel,
    ...fieldProps
  },
  ref,
) {
  const { colors } = useTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const hasError = Boolean(error) || Boolean(invalid);
  const errorMessage = typeof error === 'string' ? error : undefined;
  const successMessage = typeof success === 'string' ? success : undefined;
  const tone = hasError ? 'error' : success ? 'success' : 'default';
  const resolvedAccessibilityLabel = accessibilityLabel ?? label;
  const resolvedFieldHeight = fieldHeight ?? (size === 'lg' ? INPUT_HEIGHT_LG : INPUT_HEIGHT);

  const passwordToggle =
    secureTextEntry && showPasswordToggle ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
        hitSlop={8}
        onPress={() => {
          haptics.selection();
          setPasswordVisible((current) => !current);
        }}
        style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>
          {passwordVisible ? 'Hide' : 'Show'}
        </Text>
      </Pressable>
    ) : null;

  const trailing = passwordToggle ?? rightIcon;

  return (
    <View style={{ width: '100%', gap: label ? form.labelGap : 0 }}>
      {label ? <FormLabel variant={labelVariant}>{label}</FormLabel> : null}

      {multiline ? (
        <TextArea
          ref={ref}
          tone={tone}
          disabled={disabled}
          loading={loading}
          rows={rows}
          accessibilityLabel={resolvedAccessibilityLabel}
          {...(fieldProps as Omit<TextAreaProps, 'tone' | 'rows'>)}
        />
      ) : (
        <InputField
          ref={ref}
          tone={tone}
          disabled={disabled}
          loading={loading}
          fieldHeight={resolvedFieldHeight}
          leftSlot={leftIcon}
          rightSlot={trailing}
          secureTextEntry={secureTextEntry && !passwordVisible}
          accessibilityLabel={resolvedAccessibilityLabel}
          {...fieldProps}
        />
      )}

      {hasError && errorMessage ? (
        <FormHelper tone="error">{errorMessage}</FormHelper>
      ) : successMessage ? (
        <FormHelper tone="success">{successMessage}</FormHelper>
      ) : helperText ? (
        <FormHelper>{helperText}</FormHelper>
      ) : null}
    </View>
  );
});
