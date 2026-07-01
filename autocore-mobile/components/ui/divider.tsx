import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks';

type DividerProps = ViewProps & {
  orientation?: 'horizontal' | 'vertical';
};

export function Divider({ orientation = 'horizontal', style, ...props }: DividerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        orientation === 'horizontal'
          ? { height: 1, width: '100%', backgroundColor: colors.border }
          : { width: 1, height: '100%', backgroundColor: colors.border },
        style,
      ]}
      {...props}
    />
  );
}
