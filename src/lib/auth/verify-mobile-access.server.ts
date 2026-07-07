import "server-only";

import { Permission, UserEntity, type AccessScopes } from "@autocore/rbac";
import { hasPermission } from "@/domain/user";
import { getAdminAuth } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import { resolveAccessProfile } from "@/lib/auth/resolve-access-profile.server";
import { resolveMobileWorkspaceCompanyId } from "@/lib/mobile/session-bootstrap.server";

export type VerifiedMobileAccess = {
  uid: string;
  companyId: string;
  profile: UserEntity;
  scopes: AccessScopes;
};

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export class MobileAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MobileAccessError";
    this.status = status;
  }
}

/** Bearer-only auth — for endpoints that only need the signed-in user (e.g. push device registration). */
export async function verifyMobileAuth(request: Request): Promise<{ uid: string }> {
  const token = readBearerToken(request);
  if (!token) {
    throw new MobileAccessError("Требуется авторизация", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  if (!uid) {
    throw new MobileAccessError("Недействительный токен", 401);
  }

  return { uid };
}

export async function verifyMobileAccess(
  request: Request,
  requiredPermission?: Permission,
): Promise<VerifiedMobileAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new MobileAccessError("Требуется авторизация", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  if (!uid) {
    throw new MobileAccessError("Недействительный токен", 401);
  }

  const headerCompanyId = request.headers.get("x-company-id")?.trim();
  const companyId =
    headerCompanyId && headerCompanyId.length > 0
      ? normalizeCompanyId(headerCompanyId)
      : await resolveMobileWorkspaceCompanyId(uid);
  if (!companyId) {
    throw new MobileAccessError("Сначала присоединитесь к компании", 403);
  }

  const resolved = await resolveAccessProfile(uid, companyId);

  if (resolved.profile.isActive === false) {
    throw new MobileAccessError("Аккаунт деактивирован", 403);
  }

  if (requiredPermission && !hasPermission(resolved.profile, requiredPermission)) {
    throw new MobileAccessError("Недостаточно прав для этого действия", 403);
  }

  return {
    uid,
    companyId: resolved.companyId,
    profile: resolved.profile,
    scopes: resolved.scopes,
  };
}
