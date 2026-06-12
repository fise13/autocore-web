import { claimMarketingCheckout as claimMarketingCheckoutRemote } from "@/infrastructure/stripe/billing-service";
import {
  clearPendingMarketingCheckout,
  readPendingMarketingCheckout,
} from "@/lib/marketing/pending-checkout";

export async function claimPendingMarketingCheckout(companyId: string): Promise<boolean> {
  const pending = readPendingMarketingCheckout();
  if (!pending) return false;

  await claimMarketingCheckoutRemote(companyId, pending.sessionId);
  clearPendingMarketingCheckout();
  return true;
}
