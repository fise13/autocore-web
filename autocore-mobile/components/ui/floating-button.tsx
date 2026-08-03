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

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      style={({ pressed }) => ({
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
      })}
    >
      {children}
    </Pressable>
  );
}
