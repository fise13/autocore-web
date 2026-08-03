import "server-only";

import { hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

export type VerifiedInventoryEditAccess = {
  uid: string;
  companyId: string;
};

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export class InventoryEditAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InventoryEditAccessError";
    this.status = status;
  }
}

/** Bearer + inventory_edit (no Pro gate — used by row photo uploads on all grids). */
export async function verifyInventoryEditAccess(
  request: Request,
): Promise<VerifiedInventoryEditAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new InventoryEditAccessError("Missing authorization token", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  const db = getAdminFirestore();

  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new InventoryEditAccessError("User profile not found", 403);
  }

  const user = mapAdminUser(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);
  if (!hasPermission(user, "inventory_edit")) {
    throw new InventoryEditAccessError("Insufficient permissions", 403);
  }

  const companyId = normalizeCompanyId(user.companyId ?? "");
  if (!companyId) {
    throw new InventoryEditAccessError("Company is not configured for user", 403);
  }

  return { uid, companyId };
}
