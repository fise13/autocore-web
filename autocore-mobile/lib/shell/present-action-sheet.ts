import { useActionSheetStore } from '@/lib/shell/action-sheet-store';

/**
 * Opens the liquid-glass action bubble from the dock FAB.
 */
export function presentActionSheet() {
  useActionSheetStore.getState().present();
}
