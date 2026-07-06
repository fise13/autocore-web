import type { User } from 'firebase/auth';
import { create } from 'zustand';

import type { AuthSnapshot, AuthStatus } from '@/types/auth';
import type { CompanyAppConfig } from '@/types/company-config';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserEntity } from '@/types/user';
import type { WorkspaceAccessBlock } from '@/types/workspace-access';

type AuthStore = AuthSnapshot & {
  setStatus: (status: AuthStatus) => void;
  setFirebaseUser: (user: User | null) => void;
  setResolved: (payload: {
    profile: UserEntity | null;
    companyConfig: CompanyAppConfig | null;
    memberships: UserCompanyMembership[];
    activeCompanyName: string | null;
    workspaceBlock?: WorkspaceAccessBlock | null;
    status: AuthStatus;
  }) => void;
  setHydration: (payload: {
    profile: UserEntity | null;
    companyConfig: CompanyAppConfig | null;
    memberships: UserCompanyMembership[];
    activeCompanyName: string | null;
    workspaceBlock?: WorkspaceAccessBlock | null;
  }) => void;
  setHydrating: (value: boolean) => void;
  setWorkspaceBlock: (workspaceBlock: WorkspaceAccessBlock | null) => void;
  setOnline: (value: boolean) => void;
  setError: (value: string | null) => void;
  reset: () => void;
};

const initialState: AuthSnapshot = {
  status: 'booting',
  firebaseUser: null,
  profile: null,
  companyConfig: null,
  memberships: [],
  activeCompanyName: null,
  workspaceBlock: null,
  isOnline: true,
  isHydrating: false,
  error: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setResolved: ({ profile, companyConfig, memberships, activeCompanyName, workspaceBlock, status }) =>
    set({
      profile,
      companyConfig,
      memberships,
      activeCompanyName,
      workspaceBlock: workspaceBlock ?? null,
      status,
      isHydrating: false,
      error: null,
    }),
  setHydration: ({ profile, companyConfig, memberships, activeCompanyName, workspaceBlock }) =>
    set((state) => ({
      profile,
      companyConfig,
      memberships,
      activeCompanyName,
      workspaceBlock: workspaceBlock !== undefined ? workspaceBlock : state.workspaceBlock,
      status: profile ? 'authenticated' : 'unauthenticated',
      error: null,
    })),
  setHydrating: (isHydrating) => set({ isHydrating }),
  setWorkspaceBlock: (workspaceBlock) => set({ workspaceBlock }),
  setOnline: (isOnline) => set({ isOnline }),
  setError: (error) => set({ error }),
  reset: () =>
    set((state) => ({
      ...initialState,
      isOnline: state.isOnline,
      isHydrating: false,
      status: 'unauthenticated',
    })),
}));
