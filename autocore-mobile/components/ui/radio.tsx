import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { spacing } from '@/theme';
import { Text } from './text';

type RadioOption = {
  value: string;
  label: string;
};

type RadioGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
};

export function RadioGroup({ value, onValueChange, options, disabled }: RadioGroupProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing[2] }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              haptics.toggle();
              onValueChange(option.value);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.input,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                  }}
                />
              ) : null}
            </View>
            <Text variant="body">{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
