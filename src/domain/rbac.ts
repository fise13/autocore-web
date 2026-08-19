import { Permission, UserRole } from "@/domain/user";
import { ActivityModule, ActivitySeverity } from "@/domain/activity-log";

export type CompanyEmployee = {
  id: string;
  uid: string;
  companyId: string;
  email: string;
  fullName: string;
  /** Profile photo — same source as account menu / sidebar. */
  photoURL?: string | null;
  role: UserRole;
  permissions: Permission[];
  invitedBy: string;
  createdAt?: Date;
  lastActiveAt?: Date;
  /** When false, mechanic is off shift — no pool push / claim. */
  shiftOn?: boolean;
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
  actorPhotoURL?: string | null;
  action: string;
  module?: ActivityModule;
  target: string;
  targetId?: string;
  targetName?: string;
  severity?: ActivitySeverity;
  timestamp?: Date;
  metadata?: Record<string, string | number | boolean | null>;
};

export type InviteStatus = "pending" | "used" | "expired" | "accepted" | "cancelled" | "declined";

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

export type DirectoryPersonStatus = "named" | "invited";

/** Name-only roster entry — not signed in yet; invite optional later. */
export type DirectoryPerson = {
  id: string;
  companyId: string;
  name: string;
  createdBy: string;
  createdAt?: Date;
  status: DirectoryPersonStatus;
  linkedInviteId?: string;
  note?: string;
};

