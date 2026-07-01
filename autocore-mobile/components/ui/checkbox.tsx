import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { CheckIcon } from '@/assets/icons';
import { layout, radius, spacing } from '@/theme';
import { Text } from './text';

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export function Checkbox({ checked, onCheckedChange, label, disabled }: CheckboxProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.toggle();
        onCheckedChange(!checked);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: checked ? colors.primary : colors.input,
          backgroundColor: checked ? colors.primary : colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <CheckIcon size={12} color={colors.primaryForeground} strokeWidth={3} /> : null}
      </View>
      {label ? <Text variant="body">{label}</Text> : null}
    </Pressable>
  );
}
