import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks';
import { radius, spacing, typography } from '@/theme';

type TextAreaProps = TextInputProps & {
  invalid?: boolean;
  rows?: number;
};

export const TextArea = forwardRef<TextInput, TextAreaProps>(function TextArea(
  { invalid, rows = 4, style, ...props },
  ref,
) {
  const { colors } = useTheme();
  const minHeight = rows * 22 + spacing[3] * 2;

  return (
    <TextInput
      ref={ref}
      multiline
      textAlignVertical="top"
      placeholderTextColor={colors.mutedForeground}
      style={[
        {
          minHeight,
          width: '100%',
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: invalid ? colors.destructive : colors.input,
          backgroundColor: colors.background,
          paddingHorizontal: spacing[2.5],
          paddingVertical: spacing[3],
          fontSize: typography.body.fontSize,
          fontFamily: 'GeistSans',
          color: colors.foreground,
        },
        style,
      ]}
      {...props}
    />
  );
});
