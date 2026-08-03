import type { ReactNode } from 'react';
import { ActionSheetIOS, Alert, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { haptics } from '@/theme';

export type NativeContextMenuAction = {
  id: string;
  title: string;
  systemImage?: SFSymbol;
  destructive?: boolean;
  disabled?: boolean;
  /** Prefixed with a checkmark in the system sheet when selected. */
  selected?: boolean;
};

type NativeContextMenuProps = {
  actions: NativeContextMenuAction[];
  onPressAction: (id: string) => void;
  children: ReactNode;
  longPress?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string;
};

type PresentNativeMenuOptions = {
  title?: string;
  message?: string;
  actions: NativeContextMenuAction[];
  onPressAction: (id: string) => void;
  cancelLabel?: string;
};

/**
 * Passthrough wrapper — `@expo/ui` MenuView/Host remounts blank RN trees.
 * Use `presentNativeMenu` from a long-press handler instead.
 */
export function NativeContextMenu({
  children,
  style,
}: NativeContextMenuProps) {
  return <View style={style}>{children}</View>;
}

/** Imperative system sheet — no SwiftUI Host. */
export function presentNativeMenu({
  title,
  message,
  actions,
  onPressAction,
  cancelLabel = 'Cancel',
}: PresentNativeMenuOptions): void {
  const items = actions.filter((action) => !action.disabled);
  if (items.length === 0) return;

  haptics.medium();

  const labels = items.map((action) =>
    action.selected ? `✓ ${action.title}` : action.title,
  );

  if (Platform.OS === 'ios') {
    const cancelIndex = labels.length;
    const destructiveIndex = items.findIndex((action) => action.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [...labels, cancelLabel],
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
      },
      (buttonIndex) => {
        if (buttonIndex === undefined || buttonIndex === cancelIndex) return;
        const action = items[buttonIndex];
        if (!action) return;
        haptics.selection();
        onPressAction(action.id);
      },
    );
    return;
  }

  Alert.alert(title ?? '', message, [
    ...items.map((action) => ({
      text: action.selected ? `✓ ${action.title}` : action.title,
      style: (action.destructive ? 'destructive' : 'default') as 'destructive' | 'default',
      onPress: () => {
        haptics.selection();
        onPressAction(action.id);
      },
    })),
    { text: cancelLabel, style: 'cancel' as const },
  ]);
}
