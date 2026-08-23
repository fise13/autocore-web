import { useState } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { haptics, layout, radius } from '@/theme';

type FloatingButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  bottomOffset?: number;
};

export function FloatingButton({ onPress, children, bottomOffset = 16 }: FloatingButtonProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // Static object, not `({ pressed }) => …`. NativeWind's JSX runtime
      // normalises `style` before Pressable sees it and discards a function,
      // which cost this button its position, size, radius and background.
      style={{
        position: 'absolute',
        right: 16,
        bottom: insets.bottom + bottomOffset,
        width: layout.floatingButtonSize,
        height: layout.floatingButtonSize,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
        ...shadows.elevated,
      }}
    >
      {children}
    </Pressable>
  );
}
