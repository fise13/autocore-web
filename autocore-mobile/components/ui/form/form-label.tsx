import { type ComponentProps } from 'react';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks';
import { form } from '@/theme/form';

type FormLabelProps = ComponentProps<typeof Text> & {
  required?: boolean;
  children: string;
  variant?: 'label' | 'caption';
};

export function FormLabel({ required, children, variant = 'label', style, ...props }: FormLabelProps) {
  const { colors } = useTheme();
  const isCaption = variant === 'caption';

  return (
    <Text
      accessibilityRole="text"
      style={[
        {
          fontSize: isCaption ? form.captionFontSize : form.labelFontSize,
          lineHeight: isCaption ? form.captionLineHeight : form.labelLineHeight,
          fontWeight: isCaption ? '400' : form.labelFontWeight,
          letterSpacing: isCaption ? 0 : form.labelLetterSpacing,
          color: colors.mutedForeground,
        },
        style,
      ]}
      {...props}
    >
      {children}
      {required ? ' *' : ''}
    </Text>
  );
}

export function FormHelper({ children, tone = 'muted' }: { children: string; tone?: 'muted' | 'error' | 'success' }) {
  const { colors } = useTheme();
  const color =
    tone === 'error' ? colors.destructive : tone === 'success' ? colors.success : colors.mutedForeground;

  return (
    <Text
      style={{
        fontSize: form.helperFontSize,
        lineHeight: form.helperLineHeight,
        color,
      }}
    >
      {children}
    </Text>
  );
}
