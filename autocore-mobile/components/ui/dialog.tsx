import { Modal, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { backdropIn, backdropOut, dialogIn, dialogOut } from '@/animations';
import { useTheme } from '@/hooks';
import { XIcon } from '@/assets/icons';
import { rhythm, zIndex } from '@/theme';
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
        entering={backdropIn}
        exiting={backdropOut}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: rhythm.pad,
          zIndex: zIndex.modal,
        }}
      >
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => onOpenChange(false)} />
        <Animated.View
          entering={dialogIn}
          exiting={dialogOut}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.card,
            borderRadius: rhythm.cardRadius,
            borderWidth: rhythm.hairline,
            borderColor: colors.border,
            ...shadows.elevated,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: rhythm.pad,
              gap: rhythm.stack,
            }}
          >
            <View style={{ flex: 1, gap: rhythm.micro }}>
              <Text variant="title">{title}</Text>
              {description ? <Text variant="body" color="muted">{description}</Text> : null}
            </View>
            <IconButton
              size="sm"
              variant="ghost"
              systemImage="xmark"
              accessibilityLabel="Close"
              onPress={() => onOpenChange(false)}
            >
              <XIcon size="sm" color={colors.mutedForeground} />
            </IconButton>
          </View>

          {children ? (
            <View style={{ paddingHorizontal: rhythm.pad, paddingBottom: rhythm.pad }}>{children}</View>
          ) : null}

          {footer ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: rhythm.inline,
                padding: rhythm.pad,
                borderTopWidth: rhythm.hairline,
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
