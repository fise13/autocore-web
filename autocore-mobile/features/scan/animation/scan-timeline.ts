import { screenMotion } from '@/theme/screen';

const s = screenMotion.stagger;

export const scanTimeline = {
  camera: 0,
  header: s,
  panel: s * 2,
  detectOutline: s * 3,
} as const;

export const scanSpring = {
  panel: screenMotion.spring,
  detect: screenMotion.press,
} as const;
