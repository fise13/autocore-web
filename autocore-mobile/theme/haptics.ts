import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Haptic feedback presets — native iOS/Android interactions */
export const haptics = {
  light: () => {
    if (Platform.OS === 'web') return;
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    if (Platform.OS === 'web') return;
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  heavy: () => {
    if (Platform.OS === 'web') return;
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  selection: () => {
    if (Platform.OS === 'web') return;
    return Haptics.selectionAsync();
  },
  success: () => {
    if (Platform.OS === 'web') return;
    return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning: () => {
    if (Platform.OS === 'web') return;
    return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  error: () => {
    if (Platform.OS === 'web') return;
    return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
