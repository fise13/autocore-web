import "server-only";

import { hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { readCompanyProActive } from "@/lib/billing/verify-pro-subscription.server";
import { normalizeCompanyId } from "@/lib/company-id";

export type VerifiedInventoryImportAccess = {
  uid: string;
  companyId: string;
};

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export class InventoryImportAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InventoryImportAccessError";
    this.status = status;
  }
}

export async function verifyInventoryImportAccess(
  request: Request,
): Promise<VerifiedInventoryImportAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new InventoryImportAccessError("Missing authorization token", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  const db = getAdminFirestore();

  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new InventoryImportAccessError("User profile not found", 403);
  }

  const user = mapAdminUser(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);
  if (!hasPermission(user, "inventory_edit")) {
    throw new InventoryImportAccessError("Insufficient permissions", 403);
  }

  const companyId = normalizeCompanyId(user.companyId ?? "");
  if (!companyId) {
    throw new InventoryImportAccessError("Company is not configured for user", 403);
  }

  if (!(await readCompanyProActive(companyId))) {
    throw new InventoryImportAccessError("Pro subscription required", 402);
  }

  return { uid, companyId };
}
