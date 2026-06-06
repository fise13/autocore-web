import "server-only";

import { getAdminAuth } from "@/infrastructure/firebase/admin";

export type VerifiedAccountAccess = {
  uid: string;
};

export class AccountAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AccountAccessError";
    this.status = status;
  }
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function verifyAccountAccess(request: Request): Promise<VerifiedAccountAccess> {
  const token = readBearerToken(request);
  if (!token) {
    throw new AccountAccessError("Missing authorization token", 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  if (!decoded.uid) {
    throw new AccountAccessError("Invalid authorization token", 401);
  }

  return { uid: decoded.uid };
}
