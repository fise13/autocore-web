import "server-only";

import { hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

export type VerifiedDocumentAccess = {
  uid: string;
  companyId: string;
};

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function verifyDocumentAccess(request: Request): Promise<VerifiedDocumentAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new DocumentAccessError("Missing authorization token", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  const db = getAdminFirestore();

  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new DocumentAccessError("User profile not found", 403);
  }

  const user = mapAdminUser(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);
  if (!hasPermission(user, "work_orders_view")) {
    throw new DocumentAccessError("Insufficient permissions", 403);
  }

  const companyId = normalizeCompanyId(user.companyId ?? "");
  if (!companyId) {
    throw new DocumentAccessError("Company is not configured for user", 403);
  }

  return { uid, companyId };
}

export class DocumentAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DocumentAccessError";
    this.status = status;
  }
}

export async function assertOrderCompanyAccess(companyId: string, orderCompanyId: string): Promise<void> {
  if (normalizeCompanyId(companyId) !== normalizeCompanyId(orderCompanyId)) {
    throw new DocumentAccessError("Work order belongs to another company", 403);
  }
}
