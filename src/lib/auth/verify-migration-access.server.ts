import "server-only";

import { hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

import { AccountAccessError } from "./verify-account-access";

export type VerifiedMigrationAccess = {
  uid: string;
  companyId: string;
};

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function verifyMigrationAccess(
  request: Request,
  requestedCompanyId?: string,
): Promise<VerifiedMigrationAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new AccountAccessError("Missing authorization token", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  const db = getAdminFirestore();

  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new AccountAccessError("User profile not found", 403);
  }

  const user = mapAdminUser(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);
  const profileCompanyId = normalizeCompanyId(user.companyId ?? "");
  const companyId = normalizeCompanyId(requestedCompanyId ?? profileCompanyId);

  if (!companyId) {
    throw new AccountAccessError("Company is not configured for user", 403);
  }

  if (requestedCompanyId && profileCompanyId && profileCompanyId !== companyId) {
    const companySnap = await db.collection("companies").doc(companyId).get();
    const isOwner = companySnap.exists && String(companySnap.data()?.ownerId ?? "") === uid;
    if (!isOwner) {
      throw new AccountAccessError("Company mismatch", 403);
    }
  }

  const companySnap = await db.collection("companies").doc(companyId).get();
  const isOwner = companySnap.exists && String(companySnap.data()?.ownerId ?? "") === uid;

  if (!isOwner && !hasPermission(user, "inventory_edit") && !hasPermission(user, "inventory_import")) {
    throw new AccountAccessError("Insufficient permissions", 403);
  }

  return { uid, companyId };
}
