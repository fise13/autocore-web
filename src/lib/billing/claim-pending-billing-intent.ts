import {
  activateInternalProRemote,
  startCompanyTrialRemote,
} from "@/lib/billing/internal-billing.client";
import {
  clearPendingBillingIntent,
  readPendingBillingIntent,
} from "@/lib/marketing/pending-billing-intent";

export type ClaimedBillingIntent = "trial" | "pro" | null;

export async function claimPendingBillingIntent(companyId: string): Promise<ClaimedBillingIntent> {
  const intent = readPendingBillingIntent();
  if (!intent) return null;

  try {
    if (intent.type === "pro") {
      await activateInternalProRemote(companyId, intent.interval);
      clearPendingBillingIntent();
      return "pro";
    }

    await startCompanyTrialRemote(companyId);
    clearPendingBillingIntent();
    return "trial";
  } catch (error) {
    console.warn("Billing intent claim skipped:", error);
    return null;
  }
}

export async function ensureCompanyTrial(companyId: string): Promise<boolean> {
  try {
    const result = await startCompanyTrialRemote(companyId);
    return result.started || result.proActive;
  } catch (error) {
    console.warn("Company trial start skipped:", error);
    return false;
  }
}
