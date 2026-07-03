import type { User } from 'firebase/auth';
import { create } from 'zustand';

import type { AuthSnapshot, AuthStatus } from '@/types/auth';
import type { CompanyAppConfig } from '@/types/company-config';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserEntity } from '@/types/user';

type AuthStore = AuthSnapshot & {
  setStatus: (status: AuthStatus) => void;
  setFirebaseUser: (user: User | null) => void;
  setResolved: (payload: {
    profile: UserEntity | null;
    companyConfig: CompanyAppConfig | null;
    memberships: UserCompanyMembership[];
    activeCompanyName: string | null;
    status: AuthStatus;
  }) => void;
  setHydration: (payload: {
    profile: UserEntity | null;
    companyConfig: CompanyAppConfig | null;
    memberships: UserCompanyMembership[];
    activeCompanyName: string | null;
  }) => void;
  setHydrating: (value: boolean) => void;
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
  isOnline: true,
  isHydrating: true,
  error: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setResolved: ({ profile, companyConfig, memberships, activeCompanyName, status }) =>
    set({
      profile,
      companyConfig,
      memberships,
      activeCompanyName,
      status,
      isHydrating: false,
      error: null,
    }),
  setHydration: ({ profile, companyConfig, memberships, activeCompanyName }) =>
    set({
      profile,
      companyConfig,
      memberships,
      activeCompanyName,
      status: profile ? 'authenticated' : 'unauthenticated',
      isHydrating: false,
      error: null,
    }),
  setHydrating: (isHydrating) => set({ isHydrating }),
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
