import { Easing } from 'react-native-reanimated';

/** Snappy open for scan result sheets — barcode → menu should feel immediate. */
export const scanSheetAnimationConfigs = {
  duration: 140,
  easing: Easing.out(Easing.cubic),
} as const;
