import "server-only";

import { hasPermission } from "@/domain/user";
import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { mapAdminUser } from "@/infrastructure/firestore/admin-mappers";
import { normalizeCompanyId } from "@/lib/company-id";

export type VerifiedCompanySettingsAccess = {
  uid: string;
  companyId: string;
};

export class CompanySettingsAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CompanySettingsAccessError";
    this.status = status;
  }
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function verifyCompanySettingsAccess(
  request: Request,
): Promise<VerifiedCompanySettingsAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new CompanySettingsAccessError("Missing authorization token", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const db = getAdminFirestore();
  const userSnapshot = await db.collection("users").doc(decoded.uid).get();

  if (!userSnapshot.exists) {
    throw new CompanySettingsAccessError("User profile not found", 403);
  }

  const user = mapAdminUser(userSnapshot.id, userSnapshot.data() as Record<string, unknown>);
  if (!hasPermission(user, "settings_manage")) {
    throw new CompanySettingsAccessError("Insufficient permissions", 403);
  }

  const companyId = normalizeCompanyId(user.companyId ?? "");
  if (!companyId) {
    throw new CompanySettingsAccessError("Company is not configured for user", 403);
  }

  return { uid: decoded.uid, companyId };
}
