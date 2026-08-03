import { Modal, Pressable, View } from 'react-native';

import { useTheme } from '@/hooks';
import { haptics, zIndex } from '@/theme';
import { tokens } from '@/theme/tokens';

import { Text } from './text';

type MenuItem = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

type MenuProps = {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  anchor?: { x: number; y: number };
};

/**
 * Anchored overflow / context menu.
 * Unmounts immediately on close — exit animations left a full-screen Modal
 * eating taps while NativeTabs stayed responsive.
 */
export function Menu({ visible, onClose, items, anchor }: MenuProps) {
  const { colors, shadows } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Pressable style={StyleSheetFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={{
            position: 'absolute',
            top: anchor?.y ?? '36%',
            left: anchor?.x ?? tokens.space.screenX,
            minWidth: 220,
            maxWidth: 320,
            backgroundColor: colors.card,
            borderRadius: tokens.radius.group,
            borderWidth: tokens.control.hairline,
            borderColor: colors.border,
            overflow: 'hidden',
            zIndex: zIndex.modal,
            ...shadows.elevated,
          }}
        >
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="menuitem"
              onPress={() => {
                haptics.selection();
                item.onPress();
                onClose();
              }}
              style={{
                minHeight: tokens.control.hitTarget,
                paddingHorizontal: tokens.space.stack + 4,
                justifyContent: 'center',
                borderBottomWidth: index < items.length - 1 ? tokens.control.hairline : 0,
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
      </View>
    </Modal>
  );
}

const StyleSheetFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

/** @deprecated Prefer Menu — kept for call-site compatibility. */
export function ContextMenu(props: MenuProps) {
  return <Menu {...props} />;
}
