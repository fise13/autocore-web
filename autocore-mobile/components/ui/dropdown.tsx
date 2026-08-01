import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { backdropIn, backdropOut, popoverIn, popoverOut } from '@/animations';
import { CheckIcon, ChevronDownIcon } from '@/assets/icons';
import { useTheme } from '@/hooks';
import { haptics, radius, spacing } from '@/theme';

import { Text } from './text';

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
};

type Anchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MENU_MAX_HEIGHT = 260;
const MENU_MIN_WIDTH = 160;
const EDGE = 8;
const GAP = 4;
const ROW_HEIGHT = 40;

export function Dropdown({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
}: DropdownProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const triggerRef = useRef<RNView>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const selected = options.find((option) => option.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setAnchor(null);
  }, []);

  const openMenu = useCallback(() => {
    haptics.selection();
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const menuLayout = (() => {
    if (!anchor) return null;

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const estimatedHeight = Math.min(MENU_MAX_HEIGHT, options.length * ROW_HEIGHT + 8);
    const width = Math.max(anchor.width, MENU_MIN_WIDTH);

    let left = anchor.x;
    if (left + width > screenW - EDGE) left = screenW - width - EDGE;
    if (left < EDGE) left = EDGE;

    const spaceBelow = screenH - insets.bottom - (anchor.y + anchor.height) - EDGE;
    const spaceAbove = anchor.y - insets.top - EDGE;
    const placeBelow = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove;

    const top = placeBelow
      ? anchor.y + anchor.height + GAP
      : Math.max(insets.top + EDGE, anchor.y - GAP - estimatedHeight);

    const maxHeight = placeBelow
      ? Math.min(MENU_MAX_HEIGHT, Math.max(spaceBelow, ROW_HEIGHT * 2))
      : Math.min(MENU_MAX_HEIGHT, Math.max(spaceAbove, ROW_HEIGHT * 2));

    return { top, left, width, maxHeight };
  })();

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={openMenu}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.trigger,
                {
                  borderColor: open ? colors.primary : colors.input,
                  backgroundColor: colors.background,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text
                variant="body"
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: selected ? colors.foreground : colors.mutedForeground,
                }}
              >
                {selected?.label ?? placeholder}
              </Text>
              <ChevronDownIcon size={16} color={colors.mutedForeground} strokeWidth={2} />
            </View>
          )}
        </Pressable>
      </View>

      <Modal
        visible={open && Boolean(menuLayout)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.overlay} pointerEvents="box-none">
          <Animated.View
            entering={backdropIn}
            exiting={backdropOut}
            style={StyleSheet.absoluteFill}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          </Animated.View>
          {menuLayout ? (
            <Animated.View
              entering={popoverIn}
              exiting={popoverOut}
              style={[
                styles.menu,
                {
                  top: menuLayout.top,
                  left: menuLayout.left,
                  width: menuLayout.width,
                  maxHeight: menuLayout.maxHeight,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  ...shadows.sm,
                },
              ]}
            >
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={options.length > 6}
              >
                {options.map((option, index) => {
                  const isSelected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        haptics.selection();
                        onValueChange(option.value);
                        close();
                      }}
                    >
                      {({ pressed }) => (
                        <View
                          style={[
                            styles.row,
                            {
                              borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0,
                              borderTopColor: colors.border,
                              backgroundColor: pressed
                                ? colors.muted
                                : isSelected
                                  ? colors.muted
                                  : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            variant="body"
                            numberOfLines={1}
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: isSelected ? '600' : '400',
                              color: colors.foreground,
                            }}
                          >
                            {option.label}
                          </Text>
                          {isSelected ? (
                            <CheckIcon size={16} color={colors.primary} strokeWidth={2.2} />
                          ) : null}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 50,
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
  },
});
