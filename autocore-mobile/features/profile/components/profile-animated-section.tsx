import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { radius } from '@/theme/radius';

type ProfileSegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  delay?: number;
};

export function ProfileSegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: ProfileSegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: radius['3xl'],
        backgroundColor: colors.surfaceElevated,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.selection();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: radius['2xl'],
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.card : 'transparent',
            }}
          >
            <Text
              variant="caption"
              style={{
                fontWeight: active ? '600' : '500',
                fontSize: 13,
                color: active ? colors.foreground : colors.mutedForeground,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ProfileAnimatedSectionProps = {
  children: ReactNode;
  delay?: number;
};

export function ProfileAnimatedSection({ children }: ProfileAnimatedSectionProps) {
  return <View style={{ gap: 16 }}>{children}</View>;
}
