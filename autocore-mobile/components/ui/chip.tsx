import { Pressable, type PressableProps } from 'react-native';

import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { layout } from '@/theme';
import { Text } from './text';

type ChipProps = Omit<PressableProps, 'style'> & {
  selected?: boolean;
  children: React.ReactNode;
  style?: PressableProps['style'];
};

export function Chip({ selected, children, onPress, style, ...props }: ChipProps) {
  const { colors } = useTheme();

  const baseStyle = {
    height: layout.chip.height,
    paddingHorizontal: layout.chip.paddingHorizontal,
    borderRadius: layout.chip.borderRadius,
    backgroundColor: selected ? colors.primary : colors.secondary,
    borderWidth: 1,
    borderColor: selected ? colors.primary : colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <Pressable
      onPress={(e) => {
        haptics.selection();
        onPress?.(e);
      }}
      style={typeof style === 'function' ? (state) => [baseStyle, style(state)] : [baseStyle, style]}
      {...props}
    >
      <Text
        variant="caption"
        style={{ color: selected ? colors.primaryForeground : colors.secondaryForeground, fontWeight: '500' }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
