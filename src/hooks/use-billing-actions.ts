"use client";

import { useCallback, useEffect, useState } from "react";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { openBillingPortal, startProCheckout, syncCompanyBilling } from "@/infrastructure/stripe/billing-service";
import { normalizeCompanyId } from "@/lib/company-id";
import { StripeBillingInterval } from "@/lib/stripe/prices";
import { userCopy } from "@/lib/user-copy";

const BILLING_PORTAL_RETURN_KEY = "autocore-billing-portal-return";

type UseBillingActionsOptions = {
  companyId: string;
  onStatus?: (message: string | null) => void;
  syncOnPortalReturn?: boolean;
};

export function useBillingActions({
  companyId,
  onStatus,
  syncOnPortalReturn = true,
}: UseBillingActionsOptions) {
  const resolvedCompanyId = normalizeCompanyId(companyId);
  const { isPro, isLoading, canManageBilling } = useBillingGate();
  const [pending, setPending] = useState<"monthly" | "yearly" | "portal" | "sync" | null>(null);

  useEffect(() => {
    if (!syncOnPortalReturn) return;
    if (sessionStorage.getItem(BILLING_PORTAL_RETURN_KEY) !== "1") return;
    sessionStorage.removeItem(BILLING_PORTAL_RETURN_KEY);

    setPending("sync");
    void syncCompanyBilling(resolvedCompanyId)
      .then((active) => {
        onStatus?.(active ? userCopy.billing.proActiveHint : userCopy.billing.freeActiveHint);
      })
      .catch((error) => {
        onStatus?.(error instanceof Error ? error.message : userCopy.billing.loadError);
      })
      .finally(() => setPending(null));
  }, [onStatus, resolvedCompanyId, syncOnPortalReturn]);

  const runAction = useCallback(
    async (action: "monthly" | "yearly" | "portal", runner: () => Promise<string>) => {
      setPending(action);
      onStatus?.(null);
      try {
        const url = await runner();
        if (action === "portal") {
          sessionStorage.setItem(BILLING_PORTAL_RETURN_KEY, "1");
        } else {
          sessionStorage.setItem("autocore-pro-checkout-pending", "1");
        }
        window.location.assign(url);
      } catch (error) {
        onStatus?.(error instanceof Error ? error.message : userCopy.billing.checkoutUnavailable);
        setPending(null);
      }
    },
    [onStatus],
  );

  const checkout = useCallback(
    (interval: StripeBillingInterval) =>
      runAction(interval, () => startProCheckout(resolvedCompanyId, interval)),
    [resolvedCompanyId, runAction],
  );

  const openPortal = useCallback(
    () => runAction("portal", () => openBillingPortal(resolvedCompanyId)),
    [resolvedCompanyId, runAction],
  );

  const syncBilling = useCallback(async () => {
    setPending("sync");
    onStatus?.(null);
    try {
      const active = await syncCompanyBilling(resolvedCompanyId);
      onStatus?.(active ? userCopy.billing.proActiveHint : userCopy.billing.freeActiveHint);
      return active;
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : userCopy.billing.loadError);
      return false;
    } finally {
      setPending(null);
    }
  }, [onStatus, resolvedCompanyId]);

  return {
    isPro,
    isLoading,
    canManageBilling,
    pending,
    checkout,
    openPortal,
    syncBilling,
  };
}
