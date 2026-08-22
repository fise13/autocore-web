"use client";

import { useCallback, useEffect, useState } from "react";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { usePaddleSubscribe } from "@/hooks/use-paddle-subscribe";
import { refreshCompanyBillingRemote } from "@/lib/billing/internal-billing.client";
import { syncCompanyBillingState } from "@/lib/billing/sync-company-billing.client";
import { normalizeCompanyId } from "@/lib/company-id";
import { isPaddleCheckoutConfigured } from "@/lib/paddle/config";
import { type PaddleBillingInterval } from "@/lib/paddle/prices";
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
  const { subscribe, ready: paddleReady, configured: paddleConfigured } = usePaddleSubscribe();
  const [pending, setPending] = useState<"sync" | "checkout" | null>(null);

  useEffect(() => {
    if (!syncOnPortalReturn) return;
    if (sessionStorage.getItem(BILLING_PORTAL_RETURN_KEY) !== "1") return;
    sessionStorage.removeItem(BILLING_PORTAL_RETURN_KEY);

    setPending("sync");
    void syncCompanyBillingState(resolvedCompanyId)
      .then((active) => {
        onStatus?.(active ? userCopy.billing.proActiveHint : userCopy.billing.freeActiveHint);
      })
      .catch((error) => {
        onStatus?.(error instanceof Error ? error.message : userCopy.billing.loadError);
      })
      .finally(() => setPending(null));
  }, [onStatus, resolvedCompanyId, syncOnPortalReturn]);

  const checkout = useCallback(
    async (interval: PaddleBillingInterval) => {
      if (!canManageBilling) return;
      setPending("checkout");
      onStatus?.(null);

      try {
        if (!paddleConfigured) {
          throw new Error(userCopy.billing.paymentUnavailable);
        }
        if (!paddleReady) {
          throw new Error("Paddle checkout is still loading");
        }

        sessionStorage.setItem(PRO_CHECKOUT_SESSION_KEY, "1");
        const opened = await subscribe({
          interval,
          companyId: resolvedCompanyId,
          syncAfterComplete: true,
        });
        if (!opened) {
          throw new Error(userCopy.billing.paymentUnavailable);
        }
      } catch (error) {
        onStatus?.(error instanceof Error ? error.message : userCopy.billing.loadError);
      } finally {
        setPending(null);
      }
    },
    [canManageBilling, onStatus, paddleConfigured, paddleReady, resolvedCompanyId, subscribe],
  );

  const openPortal = useCallback(async () => {
    if (!canManageBilling) return;

    if (isPaddleCheckoutConfigured()) {
      setPending("sync");
      onStatus?.(null);
      try {
        const { openPaddlePortalRemote } = await import("@/lib/billing/sync-company-billing.client");
        const url = await openPaddlePortalRemote(resolvedCompanyId);
        sessionStorage.setItem(BILLING_PORTAL_RETURN_KEY, "1");
        window.location.assign(url);
      } catch (error) {
        onStatus?.(error instanceof Error ? error.message : userCopy.billing.loadError);
      } finally {
        setPending(null);
      }
      return;
    }

    onStatus?.(userCopy.billing.paymentUnavailable);
  }, [canManageBilling, onStatus, resolvedCompanyId]);

  const syncBilling = useCallback(async () => {
    setPending("sync");
    onStatus?.(null);
    try {
      const refreshed = await refreshCompanyBillingRemote(resolvedCompanyId);
      if (refreshed.proActive) {
        onStatus?.(userCopy.billing.proActiveHint);
        return true;
      }
      const active = await syncCompanyBillingState(resolvedCompanyId);
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
