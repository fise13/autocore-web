import { activateInternalProRemote } from "@/lib/billing/internal-billing.client";
import {
  clearPendingBillingIntent,
  readPendingBillingIntent,
} from "@/lib/marketing/pending-billing-intent";

export type ClaimedBillingIntent = "trial" | "pro" | null;

/**
 * Consumes a leftover marketing `billing=pro` grant.
 *
 * `billing=trial` is not granted here — Pro trial starts only through Paddle
 * checkout (card on file). The billing gate opens that overlay.
 */
export async function claimPendingBillingIntent(companyId: string): Promise<ClaimedBillingIntent> {
  const intent = readPendingBillingIntent();
  if (!intent) return null;
  if (intent.type === "trial") return "trial";

  try {
    await activateInternalProRemote(companyId, intent.interval);
    clearPendingBillingIntent();
    return "pro";
  } catch (error) {
    console.warn("Billing intent claim skipped:", error);
    return null;
  }
}
