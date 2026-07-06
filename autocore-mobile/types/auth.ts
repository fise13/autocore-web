import type { User } from 'firebase/auth';

import type { CompanyAppConfig } from './company-config';
import type { UserCompanyMembership } from './rbac';
import type { UserEntity } from './user';
import type { WorkspaceAccessBlock } from './workspace-access';

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

export type AuthSnapshot = {
  status: AuthStatus;
  firebaseUser: User | null;
  profile: UserEntity | null;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
  workspaceBlock: WorkspaceAccessBlock | null;
  isOnline: boolean;
  isHydrating: boolean;
  error: string | null;
};
