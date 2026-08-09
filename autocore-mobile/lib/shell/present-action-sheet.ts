import { useActionSheetStore } from '@/lib/shell/action-sheet-store';

/**
 * Opens the floating glass New composer (ActionSheetHost Modal).
 * Prefer this over platform action sheets — matches the capture-card reference.
 */
export function presentActionSheet() {
  useActionSheetStore.getState().present();
}
