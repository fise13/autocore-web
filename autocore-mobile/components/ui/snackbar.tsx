import { Pressable, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { radius, spacing, zIndex } from '@/theme';
import { Text } from './text';
import { Button } from './button';

type SnackbarProps = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
};

export function Snackbar({ visible, message, actionLabel, onAction, onDismiss }: SnackbarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(280)}
      exiting={SlideOutDown.duration(200)}
      style={{
        position: 'absolute',
        bottom: insets.bottom + spacing[4],
        left: spacing[4],
        right: spacing[4],
        zIndex: zIndex.toast,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.foreground,
          borderRadius: radius.lg,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          gap: spacing[3],
          ...shadows.elevated,
        }}
      >
        <Text variant="body" style={{ color: colors.background, flex: 1 }}>
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction}>
            <Text variant="button" style={{ color: colors.primary }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
