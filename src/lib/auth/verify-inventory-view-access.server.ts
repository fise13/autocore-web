import "server-only";

import { hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";
import { resolveAccessProfile } from "@/lib/auth/resolve-access-profile.server";

export type VerifiedInventoryViewAccess = {
  uid: string;
  companyId: string;
};

export class InventoryViewAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InventoryViewAccessError";
    this.status = status;
  }
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function verifyInventoryViewAccess(
  request: Request,
): Promise<VerifiedInventoryViewAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new InventoryViewAccessError("Требуется авторизация", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  if (!uid) {
    throw new InventoryViewAccessError("Недействительный токен", 401);
  }

  const db = getAdminFirestore();
  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new InventoryViewAccessError("Профиль не найден", 403);
  }

  const user = mapAdminUser(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);
  const companyId = normalizeCompanyId(user.companyId ?? "");
  if (!companyId) {
    throw new InventoryViewAccessError("Сначала присоединитесь к компании", 403);
  }

  const resolved = await resolveAccessProfile(uid, companyId);
  if (!hasPermission(resolved.profile, "inventory_view")) {
    throw new InventoryViewAccessError("Недостаточно прав", 403);
  }

  return { uid, companyId: resolved.companyId };
}
