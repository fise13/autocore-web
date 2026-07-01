import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { XIcon } from '@/assets/icons';
import { radius, spacing, zIndex } from '@/theme';
import { IconButton } from './icon-button';
import { Text } from './text';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  const { colors, shadows } = useTheme();

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={() => onOpenChange(false)}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[4],
          zIndex: zIndex.modal,
        }}
      >
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => onOpenChange(false)} />
        <Animated.View
          entering={SlideInDown.duration(280).springify()}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.card,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.elevated,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: spacing[4],
              gap: spacing[3],
            }}
          >
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Text variant="title">{title}</Text>
              {description ? <Text variant="body" color="muted">{description}</Text> : null}
            </View>
            <IconButton size="sm" onPress={() => onOpenChange(false)}>
              <XIcon size="sm" color={colors.mutedForeground} />
            </IconButton>
          </View>

          {children ? <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}>{children}</View> : null}

          {footer ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: spacing[2],
                padding: spacing[4],
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
