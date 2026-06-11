import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import {
  clearPendingMarketingCheckout,
  readPendingMarketingCheckout,
} from "@/lib/marketing/pending-checkout";

export async function claimPendingMarketingCheckout(companyId: string): Promise<boolean> {
  const pending = readPendingMarketingCheckout();
  if (!pending) return false;

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return false;

  const token = await user.getIdToken();
  const response = await fetch("/api/billing/claim-marketing-checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ companyId, sessionId: pending.sessionId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось активировать Pro после оплаты");
  }

  clearPendingMarketingCheckout();
  return true;
}
