import { create } from 'zustand';

type TabBarVisibilityState = {
  /** Number of open overlays that should hide the tab bar (sheets, modals). */
  overlayCount: number;
  presentOverlay: () => void;
  dismissOverlay: () => void;
  resetOverlays: () => void;
};

export const useTabBarVisibilityStore = create<TabBarVisibilityState>((set) => ({
  overlayCount: 0,
  presentOverlay: () => set((state) => ({ overlayCount: state.overlayCount + 1 })),
  dismissOverlay: () =>
    set((state) => ({ overlayCount: Math.max(0, state.overlayCount - 1) })),
  resetOverlays: () => set({ overlayCount: 0 }),
}));
