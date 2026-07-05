import { type ReactNode } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';

import { useTheme } from '@/hooks';
import { form } from '@/theme/form';
import { rhythm } from '@/theme';

type FormPanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
};

/** Elevated form surface — auth sheets, settings blocks, modal forms. */
export function FormPanel({ children, style, gap = form.fieldGap }: FormPanelProps) {
  const { colors, scheme } = useTheme();

  return (
    <View
      style={[
        {
          width: '100%',
          borderRadius: rhythm.cardRadius,
          borderWidth: form.controlBorderWidth,
          borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
          backgroundColor: scheme === 'dark' ? colors.card : colors.background,
          padding: 20,
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
