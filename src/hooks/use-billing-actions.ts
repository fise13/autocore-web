"use client";

import { useCallback, useEffect, useState } from "react";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  activateInternalProRemote,
  refreshCompanyBillingRemote,
} from "@/lib/billing/internal-billing.client";
import { syncCompanyBilling } from "@/infrastructure/stripe/billing-service";
import { normalizeCompanyId } from "@/lib/company-id";
import { StripeBillingInterval } from "@/lib/stripe/prices";
import { userCopy } from "@/lib/user-copy";

const BILLING_PORTAL_RETURN_KEY = "autocore-billing-portal-return";
const PRO_CHECKOUT_SESSION_KEY = "autocore-pro-checkout-pending";

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
  const { toast } = useToast();
  const [pending, setPending] = useState<"sync" | "checkout" | null>(null);

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

  const checkout = useCallback(
    async (interval: StripeBillingInterval) => {
      if (!canManageBilling) return;
      setPending("checkout");
      onStatus?.(null);
      try {
        await activateInternalProRemote(resolvedCompanyId, interval);
        sessionStorage.setItem(PRO_CHECKOUT_SESSION_KEY, "1");
        onStatus?.(userCopy.billing.proActiveHint);
        toast({
          title: userCopy.billing.proActivation.celebrationTitle,
          description: userCopy.billing.proActivation.celebrationSubtitle,
        });
      } catch (error) {
        onStatus?.(error instanceof Error ? error.message : userCopy.billing.loadError);
        toast({
          title: userCopy.billing.paymentUnavailableTitle,
          description: userCopy.billing.paymentUnavailable,
        });
      } finally {
        setPending(null);
      }
    },
    [canManageBilling, onStatus, resolvedCompanyId, toast],
  );

  const openPortal = useCallback(() => {
    toast({
      title: userCopy.billing.paymentUnavailableTitle,
      description: userCopy.billing.paymentUnavailable,
    });
  }, [toast]);

  const syncBilling = useCallback(async () => {
    setPending("sync");
    onStatus?.(null);
    try {
      const refreshed = await refreshCompanyBillingRemote(resolvedCompanyId);
      if (refreshed.proActive) {
        onStatus?.(userCopy.billing.proActiveHint);
        return true;
      }
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
