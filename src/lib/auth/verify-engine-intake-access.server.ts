import "server-only";

import { hasPermission, type Permission, type UserEntity } from "@autocore/rbac";

import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { resolveAccessProfile } from "@/lib/auth/resolve-access-profile.server";

export type EngineIntakeCapability = "view" | "execute" | "verify";

export type VerifiedEngineIntakeAccess = {
  uid: string;
  companyId: string;
  profile: UserEntity;
  actorName: string | null;
  actorRole: string;
};

const CAPABILITY_PERMISSION: Record<EngineIntakeCapability, Permission> = {
  view: "engine_intake_view",
  execute: "engine_intake_execute",
  verify: "engine_intake_verify",
};

export class EngineIntakeAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EngineIntakeAccessError";
    this.status = status;
  }
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

async function resolveRequestedCompanyId(request: Request, uid: string): Promise<string> {
  const requested = normalizeCompanyId(request.headers.get("x-company-id") ?? "");
  if (requested) return requested;

  const userSnapshot = await getAdminFirestore().collection("users").doc(uid).get();
  return normalizeCompanyId(String(userSnapshot.data()?.companyId ?? ""));
}

export async function verifyEngineIntakeAccess(
  request: Request,
  capability: EngineIntakeCapability,
): Promise<VerifiedEngineIntakeAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new EngineIntakeAccessError("Missing authorization token", 401);
  }

  let uid = "";
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    throw new EngineIntakeAccessError("Invalid authorization token", 401);
  }
  if (!uid) {
    throw new EngineIntakeAccessError("Invalid authorization token", 401);
  }

  const companyId = await resolveRequestedCompanyId(request, uid);
  if (!companyId) {
    throw new EngineIntakeAccessError("Company is not configured for user", 403);
  }

  let access: Awaited<ReturnType<typeof resolveAccessProfile>>;
  try {
    access = await resolveAccessProfile(uid, companyId);
  } catch {
    throw new EngineIntakeAccessError("Company access is not available", 403);
  }

  if (!access.profile.isCompanyOwner && !access.hasEmployeeMembership) {
    throw new EngineIntakeAccessError("Company membership is required", 403);
  }

  const permission = CAPABILITY_PERMISSION[capability];
  if (!hasPermission(access.profile, permission)) {
    throw new EngineIntakeAccessError("Insufficient engine intake permissions", 403);
  }

  return {
    uid,
    companyId,
    profile: access.profile,
    actorName: access.profile.displayName,
    actorRole: access.profile.role,
  };
}
