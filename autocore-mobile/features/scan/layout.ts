import { rhythm } from '@/theme/screen';

/** Scan — Apple Camera chrome + Notion sheet rhythm */
export const scanLayout = {
  pad: rhythm.pad,
  controlSize: 44,
  controlRadius: 999,
  cornerLength: 22,
  cornerStroke: 2.25,
  frameRadius: 4,
  frameSize: 248,
  frames: {
    auto: { width: 248, height: 248 },
    vin: { width: 300, height: 88 },
    document: { width: 268, height: 340 },
  },
  toolbarIconSize: 22,
  toolbarGap: 28,
  sheetPadX: 20,
  sheetPadY: 8,
  sheetTitleSize: 22,
  sheetMetaSize: 14,
  primaryButtonHeight: 52,
  primaryButtonRadius: 999,
  noticeTopOffset: 58,
} as const;

export type ScanCaptureMode = keyof typeof scanLayout.frames;
