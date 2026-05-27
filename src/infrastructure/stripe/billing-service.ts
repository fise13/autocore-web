import { httpsCallable } from "firebase/functions";

import { getFirebaseFunctions } from "@/infrastructure/firebase/client";
import { mapBillingCallableError } from "@/lib/stripe/billing-errors";
import { StripeBillingInterval, stripePriceIdForInterval } from "@/lib/stripe/prices";

type CheckoutResponse = { url: string };
type PortalResponse = { url: string };

export async function startProCheckout(companyId: string, interval: StripeBillingInterval): Promise<string> {
  try {
    const functions = getFirebaseFunctions();
    const createCheckoutSession = httpsCallable<
      { companyId: string; priceId: string },
      CheckoutResponse
    >(functions, "createCheckoutSession");

    const result = await createCheckoutSession({
      companyId,
      priceId: stripePriceIdForInterval(interval),
    });

    const url = result.data?.url?.trim();
    if (!url) {
      throw new Error("Stripe Checkout не вернул ссылку");
    }
    return url;
  } catch (error) {
    throw new Error(mapBillingCallableError(error));
  }
}

export async function openBillingPortal(companyId: string): Promise<string> {
  try {
    const functions = getFirebaseFunctions();
    const createBillingPortalSession = httpsCallable<{ companyId: string }, PortalResponse>(
      functions,
      "createBillingPortalSession",
    );

    const result = await createBillingPortalSession({ companyId });
    const url = result.data?.url?.trim();
    if (!url) {
      throw new Error("Stripe Portal не вернул ссылку");
    }
    return url;
  } catch (error) {
    throw new Error(mapBillingCallableError(error));
  }
}

type SyncBillingResponse = { proActive: boolean };

export async function syncCompanyBilling(companyId: string): Promise<boolean> {
  try {
    const functions = getFirebaseFunctions();
    const syncBilling = httpsCallable<{ companyId: string }, SyncBillingResponse>(
      functions,
      "syncCompanyBilling",
    );
    const result = await syncBilling({ companyId });
    return Boolean(result.data?.proActive);
  } catch (error) {
    throw new Error(mapBillingCallableError(error));
  }
}
