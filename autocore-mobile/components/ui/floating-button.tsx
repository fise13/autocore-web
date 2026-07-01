import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { usePressAnimation } from '@/animations';
import { haptics, layout, radius } from '@/theme';

type FloatingButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  bottomOffset?: number;
};

export function FloatingButton({ onPress, children, bottomOffset = 16 }: FloatingButtonProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { style: pressStyle, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View
      style={[
        pressStyle,
        {
          position: 'absolute',
          right: 16,
          bottom: insets.bottom + bottomOffset,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          width: layout.floatingButtonSize,
          height: layout.floatingButtonSize,
          borderRadius: radius.full,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.elevated,
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
