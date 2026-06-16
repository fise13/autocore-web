import { httpsCallable } from "firebase/functions";

import { getFirebaseFunctions } from "@/infrastructure/firebase/client";
import { getAppOrigin } from "@/lib/app-url";
import { getAppUrl, getMarketingUrl } from "@/lib/site-urls";
import { mapBillingCallableError } from "@/lib/stripe/billing-errors";
import { StripeBillingInterval, stripePriceIdForInterval } from "@/lib/stripe/prices";

type CheckoutResponse = { url: string; sessionId?: string };
type PortalResponse = { url: string };
type ClaimMarketingResponse = { proActive: boolean };

export async function startMarketingProCheckout(interval: StripeBillingInterval): Promise<string> {
  try {
    const functions = getFirebaseFunctions();
    const createMarketingCheckoutSession = httpsCallable<
      { interval: StripeBillingInterval; returnOrigin?: string; marketingOrigin?: string },
      CheckoutResponse
    >(functions, "createMarketingCheckoutSession");

    const appOrigin = getAppUrl().replace(/\/$/, "");
    const marketingOrigin =
      typeof window !== "undefined"
        ? window.location.origin.replace(/\/$/, "")
        : getMarketingUrl().replace(/\/$/, "");

    const result = await createMarketingCheckoutSession({
      interval,
      returnOrigin: appOrigin,
      marketingOrigin,
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

export async function claimMarketingCheckout(companyId: string, sessionId: string): Promise<boolean> {
  try {
    const functions = getFirebaseFunctions();
    const claim = httpsCallable<
      { companyId: string; sessionId: string },
      ClaimMarketingResponse
    >(functions, "claimMarketingCheckout");

    const result = await claim({ companyId, sessionId });
    return Boolean(result.data?.proActive);
  } catch (error) {
    throw new Error(mapBillingCallableError(error));
  }
}

export async function startProCheckout(companyId: string, interval: StripeBillingInterval): Promise<string> {
  try {
    const functions = getFirebaseFunctions();
    const createCheckoutSession = httpsCallable<
      { companyId: string; priceId: string; returnOrigin?: string },
      CheckoutResponse
    >(functions, "createCheckoutSession");

    const result = await createCheckoutSession({
      companyId,
      priceId: stripePriceIdForInterval(interval),
      returnOrigin: getAppOrigin(),
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
    const createBillingPortalSession = httpsCallable<
      { companyId: string; returnOrigin?: string },
      PortalResponse
    >(functions, "createBillingPortalSession");

    const result = await createBillingPortalSession({
      companyId,
      returnOrigin: getAppOrigin(),
    });
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

export async function syncCompanyBilling(
  companyId: string,
  sessionId?: string,
): Promise<boolean> {
  try {
    const functions = getFirebaseFunctions();
    const syncBilling = httpsCallable<
      { companyId: string; sessionId?: string },
      SyncBillingResponse
    >(functions, "syncCompanyBilling");
    const result = await syncBilling({
      companyId,
      ...(sessionId ? { sessionId } : {}),
    });
    return Boolean(result.data?.proActive);
  } catch (error) {
    throw new Error(mapBillingCallableError(error));
  }
}
