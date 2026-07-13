import { Pressable, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
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

  const variantStyles = (variant: ToastVariant = 'default') => {
    switch (variant) {
      case 'success':
        return { border: colors.success, accent: colors.success };
      case 'destructive':
        return { border: colors.destructive, accent: colors.destructive };
      case 'warning':
        return { border: colors.warning, accent: colors.warning };
      default:
        return { border: colors.border, accent: colors.primary };
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: insets.bottom + spacing[20],
        left: spacing[4],
        right: spacing[4],
        zIndex: zIndex.toast,
        gap: spacing[2],
      }}
    >
      {toasts.map((item) => {
        const vs = variantStyles(item.variant);
        return (
          <Animated.View
            key={item.id}
            entering={SlideInDown.springify().damping(22).stiffness(280)}
            exiting={SlideOutDown.duration(200)}
          >
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: vs.border,
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                ...shadows.soft,
              }}
            >
              <View
                style={{
                  width: 3,
                  alignSelf: 'stretch',
                  borderRadius: radius.full,
                  backgroundColor: vs.accent,
                }}
              />
              <Pressable style={{ flex: 1 }} onPress={() => dismiss(item.id)}>
                <Text variant="heading" style={{ fontSize: 14 }}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text
                    variant="caption"
                    color="muted"
                    style={{ marginTop: spacing[0.5] }}
                    numberOfLines={4}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </Pressable>
              {item.action ? (
                <Pressable
                  onPress={() => {
                    item.action?.onPress();
                    dismiss(item.id);
                  }}
                  hitSlop={8}
                >
                  <Text variant="caption" style={{ color: vs.accent, fontWeight: '600' }}>
                    {item.action.label}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

export { toast } from './toast-store';
