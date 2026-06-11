const SCAN_GAP_MS = 80;
const MIN_BARCODE_LENGTH = 3;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export type BarcodeScanListener = {
  handleKeyDown: (event: KeyboardEvent) => void;
  reset: () => void;
};

export function createBarcodeScanListener(onScan: (code: string) => void): BarcodeScanListener {
  let buffer = "";
  let lastKeyAt = 0;
  let collecting = false;

  return {
    handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      if (event.key === "Enter" && buffer.length >= MIN_BARCODE_LENGTH) {
        event.preventDefault();
        const code = buffer.trim();
        buffer = "";
        collecting = false;
        if (code) onScan(code);
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const now = Date.now();
        if (!collecting || now - lastKeyAt > SCAN_GAP_MS) {
          buffer = event.key;
        } else {
          buffer += event.key;
        }
        lastKeyAt = now;
        collecting = true;
      }
    },
    reset() {
      buffer = "";
      collecting = false;
    },
  };
}
