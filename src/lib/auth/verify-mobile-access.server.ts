import "server-only";

import { Permission, UserEntity, type AccessScopes } from "@autocore/rbac";
import { hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resolveAccessProfile } from "@/lib/auth/resolve-access-profile.server";
import { normalizeCompanyId } from "@/lib/company-id";

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

  const userSnap = await getAdminFirestore().collection("users").doc(uid).get();
  if (!userSnap.exists) {
    throw new MobileAccessError("Профиль пользователя не найден", 403);
  }

  const trimmedCompanyId = String(userSnap.data()?.companyId ?? "").trim();
  if (!trimmedCompanyId) {
    throw new MobileAccessError("Сначала присоединитесь к компании", 403);
  }

  const resolved = await resolveAccessProfile(uid, normalizeCompanyId(trimmedCompanyId));

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
