import { claimMarketingCheckout as claimMarketingCheckoutRemote } from "@/infrastructure/stripe/billing-service";
import {
  clearPendingMarketingCheckout,
  markMarketingCheckoutClaimAttempted,
  readPendingMarketingCheckout,
} from "@/lib/marketing/pending-checkout";

const CLAIM_TIMEOUT_MS = 20_000;

export async function claimPendingMarketingCheckout(companyId: string): Promise<boolean> {
  const pending = readPendingMarketingCheckout();
  if (!pending) return false;

  try {
    await Promise.race([
      claimMarketingCheckoutRemote(companyId, pending.sessionId),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Marketing checkout claim timed out")), CLAIM_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    markMarketingCheckoutClaimAttempted();
    throw error;
  }

  clearPendingMarketingCheckout();
  return true;
}

export async function tryClaimPendingMarketingCheckout(companyId: string): Promise<boolean> {
  try {
    return await claimPendingMarketingCheckout(companyId);
  } catch (error) {
    console.warn("Marketing checkout claim skipped:", error);
    return false;
  }
}
