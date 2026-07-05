import type { ScanContext, ScanOrderResult } from './types';

type PendingScanContext = ScanContext & {
  onComplete?: (result: ScanOrderResult) => void;
};

let pending: PendingScanContext | null = null;

export const scanContextStore = {
  begin(context: PendingScanContext): void {
    pending = context;
  },

  consume(): PendingScanContext | null {
    const current = pending;
    pending = null;
    return current;
  },

  peek(): PendingScanContext | null {
    return pending;
  },

  complete(result: ScanOrderResult): void {
    pending?.onComplete?.(result);
    pending = null;
  },

  cancel(): void {
    pending = null;
  },
};
