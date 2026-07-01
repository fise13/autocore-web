import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { radius, spacing, zIndex } from '@/theme';
import { useToastStore } from './toast-store';
import { Text } from './text';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export function ToastProvider() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  const variantBorder = (variant: ToastVariant = 'default') => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'destructive':
        return colors.destructive;
      case 'warning':
        return colors.warning;
      default:
        return colors.border;
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + spacing[2],
        left: spacing[4],
        right: spacing[4],
        zIndex: zIndex.toast,
        gap: spacing[2],
      }}
    >
      {toasts.map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeInUp.duration(280)}
          exiting={FadeOutUp.duration(200)}
        >
          <Pressable
            onPress={() => dismiss(item.id)}
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: variantBorder(item.variant),
              padding: spacing[4],
              ...shadows.soft,
            }}
          >
            <Text variant="heading" style={{ fontSize: 14 }}>
              {item.title}
            </Text>
            {item.description ? (
              <Text variant="caption" color="muted" style={{ marginTop: spacing[1] }}>
                {item.description}
              </Text>
            ) : null}
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

export { toast } from './toast-store';
