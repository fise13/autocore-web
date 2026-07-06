import type { InviteStatus as OrgInviteStatus } from '@autocore/org';

import type { Permission, UserRole } from './user';

export type CompanyEmployee = {
  id: string;
  uid: string;
  companyId: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: Permission[];
  invitedBy: string;
  createdAt?: Date;
  lastActiveAt?: Date;
  isActive: boolean;
};

export type RoleDefinition = {
  id: string;
  companyId: string;
  role: UserRole;
  permissions: Permission[];
  isSystem: boolean;
  updatedAt?: Date;
};

export type InviteStatus = OrgInviteStatus | 'used';

export type InviteDocument = {
  id: string;
  code: string;
  token?: string;
  email?: string;
  companyId: string;
  role: UserRole;
  createdAt?: Date;
  expiresAt: Date;
  createdBy: string;
  used: boolean;
  status?: InviteStatus;
};

export type EmployeeProfileSlice = {
  role?: UserRole;
  permissions?: Permission[];
  isActive?: boolean;
  fullName?: string;
};

export type UserCompanyMembership = {
  companyId: string;
  role: UserRole;
  name: string;
};
