import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

type DividerProps = ViewProps & {
  orientation?: 'horizontal' | 'vertical';
  /** Left inset for list-style dividers */
  inset?: number;
};

export function Divider({ orientation = 'horizontal', inset = 0, style, ...props }: DividerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        orientation === 'horizontal'
          ? {
              height: rhythm.hairline,
              width: '100%',
              backgroundColor: colors.border,
              marginLeft: inset,
            }
          : { width: rhythm.hairline, height: '100%', backgroundColor: colors.border },
        style,
      ]}
      {...props}
    />
  );
}
