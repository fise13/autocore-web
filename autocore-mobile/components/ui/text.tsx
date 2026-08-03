import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useDesignLanguage } from '@/hooks/use-design-language';
import type { TypographyVariant } from '@/theme';

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'destructive' | 'inherit';
};

const colorMap = {
  primary: 'foreground',
  secondary: 'textSecondary',
  muted: 'mutedForeground',
  accent: 'primary',
  destructive: 'destructive',
  inherit: null,
} as const;

/**
 * Autocore Text — Dynamic Type applied once by React Native.
 * Do not manually multiply fontSize by fontScale (that double-scales).
 */
export const Text = memo(function Text({
  variant = 'body',
  color = 'primary',
  style,
  maxFontSizeMultiplier = 1.35,
  allowFontScaling = true,
  ...props
}: TextProps) {
  const dl = useDesignLanguage();
  const variantStyle = dl.type[variant] as TextStyle;
  const colorKey = colorMap[color];
  const themeColor = colorKey ? dl.colors[colorKey as keyof typeof dl.colors] : undefined;

  return (
    <RNText
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: dl.typeFamily.sans,
          color: themeColor ?? dl.colors.foreground,
        },
        variantStyle,
        style,
      ]}
      {...props}
    />
  );
});
