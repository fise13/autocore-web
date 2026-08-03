import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(fn: () => Promise<unknown>): void {
  if (Platform.OS === 'web') return;
  // Never block the press handler / JS frame on the haptic bridge.
  queueMicrotask(() => {
    void fn();
  });
}

/** Haptic feedback presets — native iOS/Android interactions */
export const haptics = {
  light: () => {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium: () => {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  heavy: () => {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  selection: () => {
    run(() => Haptics.selectionAsync());
  },
  success: () => {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning: () => {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  error: () => {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /** Button press — subtle tactile feedback */
  press: () => haptics.light(),
  /** Toggle / switch / segmented control */
  toggle: () => haptics.selection(),
  /** Destructive action confirmation */
  destructive: () => haptics.warning(),
  /** Sheet snap point change */
  sheetSnap: () => haptics.light(),
  /** Long press context menu */
  contextMenu: () => haptics.medium(),
} as const;

export type HapticPreset = keyof typeof haptics;
