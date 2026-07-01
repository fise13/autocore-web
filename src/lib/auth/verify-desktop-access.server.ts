import "server-only";

import { Permission, hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

export type VerifiedDesktopAccess = {
  uid: string;
  companyId: string;
};

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export class DesktopAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DesktopAccessError";
    this.status = status;
  }
}

export async function verifyDesktopAccess(
  request: Request,
  requiredPermission: Permission = "inventory_view",
): Promise<VerifiedDesktopAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new DesktopAccessError("Требуется авторизация", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  if (!uid) {
    throw new DesktopAccessError("Недействительный токен", 401);
  }

  const userSnapshot = await getAdminFirestore().collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new DesktopAccessError("Профиль пользователя не найден", 403);
  }

  const user = mapAdminUser(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);
  const rawName = userSnapshot.data()?.name;
  if (!user.displayName && typeof rawName === "string" && rawName.trim()) {
    user.displayName = rawName.trim();
  }

  const trimmedCompanyId = String(user.companyId ?? "").trim();
  if (!trimmedCompanyId || trimmedCompanyId === "default") {
    throw new DesktopAccessError("Сначала присоединитесь к компании", 403);
  }

  if (!hasPermission(user, requiredPermission)) {
    throw new DesktopAccessError("Недостаточно прав для этого действия", 403);
  }

  return { uid, companyId: normalizeCompanyId(trimmedCompanyId) };
}
