import { create } from 'zustand';

/**
 * Tracks the active Work workspace so Action (+) can prioritize relevant verbs.
 * Set when entering a Work node; cleared on Home.
 */
type WorkspaceContextState = {
  workspaceContext: string | null;
  setWorkspaceContext: (id: string | null) => void;
};

export const useWorkspaceContextStore = create<WorkspaceContextState>((set) => ({
  workspaceContext: null,
  setWorkspaceContext: (workspaceContext) => set({ workspaceContext }),
}));
