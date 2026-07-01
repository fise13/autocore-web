import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { radius, spacing, zIndex } from '@/theme';
import { Text } from './text';

type ContextMenuItem = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

type ContextMenuProps = {
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  anchor?: { x: number; y: number };
};

export function ContextMenu({ visible, onClose, items, anchor }: ContextMenuProps) {
  const { colors, shadows } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
        <View
          style={{
            position: 'absolute',
            top: anchor?.y ?? '40%',
            left: anchor?.x ?? spacing[4],
            right: spacing[4],
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            zIndex: zIndex.modal,
            ...shadows.elevated,
          }}
        >
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => {
                item.onPress();
                onClose();
              }}
              style={{
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                borderBottomWidth: index < items.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderMuted,
              }}
            >
              <Text
                variant="body"
                style={{ color: item.destructive ? colors.destructive : colors.foreground }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}
