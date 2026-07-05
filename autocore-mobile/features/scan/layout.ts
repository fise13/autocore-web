import { rhythm } from '@/theme/screen';

/** Scan — aliases unified screen rhythm */
export const scanLayout = {
  pad: rhythm.pad,
  radius: rhythm.panelRadius,
  frameSize: 248,
  frameRadius: rhythm.cardRadius,
  headerLogo: rhythm.logoSm,
  title: rhythm.pageTitle,
  subtitle: rhythm.meta,
  panelRadius: rhythm.panelRadius,
  panelItemHeight: rhythm.rowMinHeight,
  /** Capture frames by mode — barcode stays live in all modes. */
  frames: {
    auto: { width: 248, height: 248 },
    vin: { width: 300, height: 96 },
    document: { width: 280, height: 360 },
  },
} as const;
