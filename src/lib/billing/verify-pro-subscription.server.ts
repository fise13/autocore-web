import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AccountAccessError } from "@/lib/auth/verify-account-access";
import { DEMO_COMPANY_ID } from "@/lib/demo/demo-config";

type SubscriptionDoc = {
  proActive?: boolean;
  plan?: string;
  status?: string;
};

export async function readCompanyProActive(companyId: string): Promise<boolean> {
  const normalized = companyId.trim();
  if (!normalized) return false;
  if (normalized === DEMO_COMPANY_ID) return true;

  const snap = await getAdminFirestore()
    .collection("companies")
    .doc(normalized)
    .collection("billing")
    .doc("subscription")
    .get();

  if (!snap.exists) return false;

  const data = snap.data() as SubscriptionDoc;
  if (typeof data.proActive === "boolean") return data.proActive;

  return (
    data.plan === "pro" &&
    (data.status === "active" || data.status === "trialing" || data.status === "past_due")
  );
}

/** Server-side Pro gate for export, invite, and other paid API features. */
export async function assertCompanyPro(companyId: string): Promise<void> {
  const isPro = await readCompanyProActive(companyId);
  if (!isPro) {
    throw new AccountAccessError("Pro subscription required", 402);
  }
}

export function subscriptionUpdatedAt(raw: unknown): Date | null {
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  return null;
}
