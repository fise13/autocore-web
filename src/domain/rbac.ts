import { Permission, UserRole } from "@/domain/user";
import { ActivityModule, ActivitySeverity } from "@/domain/activity-log";

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

export type ActivityLogEntry = {
  id: string;
  companyId: string;
  actor: string;
  actorName?: string;
  actorRole?: UserRole;
  action: string;
  module?: ActivityModule;
  target: string;
  targetId?: string;
  targetName?: string;
  severity?: ActivitySeverity;
  timestamp?: Date;
  metadata?: Record<string, string | number | boolean | null>;
};

export type InviteStatus = "pending" | "used" | "expired";

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

