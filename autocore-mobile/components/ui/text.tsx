import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useDesignLanguage } from '@/hooks';
import type { TypographyVariant } from '@/theme';

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'destructive' | 'inherit';
};

const colorMap = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  muted: 'mutedForeground',
  accent: 'primary',
  destructive: 'destructive',
  inherit: null,
} as const;

export const Text = memo(function Text({
  variant = 'body',
  color = 'primary',
  style,
  maxFontSizeMultiplier = 1.35,
  ...props
}: TextProps) {
  const dl = useDesignLanguage();
  const variantStyle = dl.type[variant] as TextStyle;
  const colorKey = colorMap[color];
  const textColor = colorKey ? dl.colors[colorKey as keyof typeof dl.colors] : undefined;

  const scaledStyle: TextStyle = {
    fontSize: dl.scaledSize(variantStyle.fontSize ?? 14),
    lineHeight: dl.scaledSize(variantStyle.lineHeight ?? 20),
  };

  return (
    <RNText
      style={[
        { fontFamily: dl.typeFamily.sans, color: textColor ?? dl.colors.textPrimary },
        variantStyle,
        scaledStyle,
        style,
      ]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
    />
  );
});
