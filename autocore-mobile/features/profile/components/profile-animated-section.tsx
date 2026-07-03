import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { useProfileEnter } from '../animation/use-profile-enter';
import { profileLayout } from '../layout';

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
  delay = 0,
}: ProfileSegmentedControlProps<T>) {
  const { colors } = useTheme();
  const enterStyle = useProfileEnter({ delay, translateY: 8, duration: 300 });

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          borderRadius: 12,
          borderWidth: profileLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.muted,
          padding: 4,
          gap: 4,
        },
        enterStyle,
      ]}
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
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.card : 'transparent',
            }}
          >
            <Text variant="caption" style={{ fontWeight: active ? '700' : '500' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

type ProfileAnimatedSectionProps = {
  children: ReactNode;
  delay?: number;
};

export function ProfileAnimatedSection({ children, delay = 0 }: ProfileAnimatedSectionProps) {
  const style = useProfileEnter({ delay, translateY: 12, duration: 340 });
  return <Animated.View style={[{ gap: 16 }, style]}>{children}</Animated.View>;
}
