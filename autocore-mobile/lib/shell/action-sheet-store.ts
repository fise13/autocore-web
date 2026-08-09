import { create } from 'zustand';

type ActionSheetState = {
  open: boolean;
  /** Bumps on every present so the host re-presents even if already open. */
  requestId: number;
  present: () => void;
  dismiss: () => void;
};

export const useActionSheetStore = create<ActionSheetState>((set) => ({
  open: false,
  requestId: 0,
  present: () => set((state) => ({ open: true, requestId: state.requestId + 1 })),
  dismiss: () => set({ open: false }),
}));
