/** @deprecated Use ScanModeControl — kept for import compatibility. */
export { ScanModeControl as ScanModeStrip } from './scan-mode-control';
export type { ScanCaptureMode } from '../layout';

export function scanModeHint(mode: 'auto' | 'vin' | 'document'): string {
  switch (mode) {
    case 'vin':
      return 'Point at the VIN plate';
    case 'document':
      return 'Fill the frame with the page';
    default:
      return 'Ready';
  }
}
