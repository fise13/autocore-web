"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ProActivationCelebration, ProActivationPhase } from "@/components/billing/pro-activation-celebration";
import { usePaddleCheckout } from "@/components/billing/paddle-provider";
import { ProPaywallDialog } from "@/components/billing/pro-paywall-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { CompanySubscription, isProSubscription } from "@/domain/billing";
import { useCompanySubscription } from "@/hooks/use-company-subscription";
import { useAuth } from "@/components/providers/auth-provider";
import { canManageBilling } from "@/lib/billing/access";
import { claimPendingBillingIntent } from "@/lib/billing/claim-pending-billing-intent";
import { tryClaimPendingMarketingCheckout } from "@/lib/billing/claim-marketing-checkout";
import { refreshCompanyBillingRemote } from "@/lib/billing/internal-billing.client";
import { ProBillingFeature } from "@/lib/billing/entitlements";
import { usePaddleSubscribe } from "@/hooks/use-paddle-subscribe";
import {
  clearPendingBillingIntent,
  readPendingBillingIntent,
} from "@/lib/marketing/pending-billing-intent";
import { readPendingMarketingCheckout } from "@/lib/marketing/pending-checkout";
import { syncCompanyBillingState } from "@/lib/billing/sync-company-billing.client";
import { userCopy } from "@/lib/user-copy";
import { track } from "@/lib/analytics/events";

const PRO_CHECKOUT_SESSION_KEY = "autocore-pro-checkout-pending";
const ACTIVATION_TIMEOUT_MS = 45_000;

type BillingGateContextValue = {
  subscription: CompanySubscription | null;
  isPro: boolean;
  isActivating: boolean;
  isLoading: boolean;
  canManageBilling: boolean;
  requirePro: (feature: ProBillingFeature, onAllowed?: () => void) => boolean;
  error: string | null;
};

const BillingGateContext = createContext<BillingGateContextValue | null>(null);

type BillingGateProviderProps = {
  companyId: string;
  children: ReactNode;
};

export function BillingGateProvider({ companyId, children }: BillingGateProviderProps) {
  const { profile } = useAuth();
  const { setRetainCustomerId } = usePaddleCheckout();
  const { subscribe, ready: paddleReady, configured: paddleConfigured } = usePaddleSubscribe();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { subscription, isLoading, error } = useCompanySubscription(companyId);
  const subscriptionIsPro = isProSubscription(subscription);
  const billingManager = canManageBilling(profile);
  const canClaimMarketingCheckout = Boolean(profile?.isCompanyOwner);
  const [paywallFeature, setPaywallFeature] = useState<ProBillingFeature | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<ProActivationPhase>("activating");
  const checkoutSyncTriggered = useRef(false);
  const pendingClaimTriggered = useRef(false);
  const billingIntentClaimTriggered = useRef(false);
  const billingRefreshTriggered = useRef(false);

  const checkoutResult = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id")?.trim() || undefined;
  const isPro = subscriptionIsPro;
  const isActivating = celebrationOpen && celebrationPhase === "activating" && !subscriptionIsPro;

  const dismissCelebration = useCallback(() => {
    setCelebrationOpen(false);
    sessionStorage.removeItem(PRO_CHECKOUT_SESSION_KEY);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkout");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setRetainCustomerId(subscription?.paddleCustomerId);
    return () => setRetainCustomerId(null);
  }, [setRetainCustomerId, subscription?.paddleCustomerId]);

  useEffect(() => {
    if (!companyId || !billingManager) return;

    void syncCompanyBillingState(companyId).catch(() => undefined);
  }, [billingManager, companyId]);

  useEffect(() => {
    if (!companyId || !canClaimMarketingCheckout || billingRefreshTriggered.current) return;
    billingRefreshTriggered.current = true;

    void refreshCompanyBillingRemote(companyId)
      .then((result) => {
        if (result.expired !== "trial" && result.expired !== "pro") return;
        const storageKey = `autocore-billing-expired-toast-${companyId}-${result.expired}`;
        if (sessionStorage.getItem(storageKey) === "1") return;
        sessionStorage.setItem(storageKey, "1");
        toast({
          title:
            result.expired === "trial"
              ? userCopy.billing.trialExpiredTitle
              : userCopy.billing.proExpiredTitle,
          description:
            result.expired === "trial"
              ? userCopy.billing.trialExpiredDescription
              : userCopy.billing.proExpiredDescription,
        });
      })
      .catch((error) => {
        console.warn("Billing refresh skipped:", error);
      });
  }, [canClaimMarketingCheckout, companyId, toast]);

  useEffect(() => {
    if (!companyId || !canClaimMarketingCheckout || billingIntentClaimTriggered.current) return;
    const intent = readPendingBillingIntent();
    if (!intent) return;

    if (intent.type === "trial") {
      if (subscriptionIsPro) {
        clearPendingBillingIntent();
        billingIntentClaimTriggered.current = true;
        return;
      }
      if (!paddleConfigured) {
        clearPendingBillingIntent();
        billingIntentClaimTriggered.current = true;
        return;
      }
      if (!paddleReady) return;
      billingIntentClaimTriggered.current = true;
      void subscribe({ interval: "monthly", companyId })
        .then((opened) => {
          if (opened) clearPendingBillingIntent();
          else billingIntentClaimTriggered.current = false;
        })
        .catch((error) => {
          console.warn("Paddle trial checkout skipped:", error);
          billingIntentClaimTriggered.current = false;
        });
      return;
    }

    billingIntentClaimTriggered.current = true;

    void claimPendingBillingIntent(companyId)
      .then((claimed) => {
        if (claimed === "pro") {
          setCelebrationOpen(true);
          setCelebrationPhase("celebrating");
        }
      })
      .catch((error) => {
        console.warn("Billing intent claim skipped in billing gate:", error);
      });
  }, [
    canClaimMarketingCheckout,
    companyId,
    paddleConfigured,
    paddleReady,
    subscribe,
    subscriptionIsPro,
  ]);

  useEffect(() => {
    if (!companyId || !canClaimMarketingCheckout || pendingClaimTriggered.current) return;

    const pending = readPendingMarketingCheckout();
    if (!pending) return;

    pendingClaimTriggered.current = true;
    const sessionId = pending.sessionId;

    void tryClaimPendingMarketingCheckout(companyId)
      .then(async (claimed) => {
        if (!claimed) return;

        setCelebrationOpen(true);
        setCelebrationPhase("celebrating");
        await syncCompanyBillingState(companyId, sessionId).catch(() => undefined);
      })
      .catch((error) => {
        console.warn("Marketing checkout claim skipped in billing gate:", error);
      });
  }, [canClaimMarketingCheckout, companyId]);

  useEffect(() => {
    const fromUrl = checkoutResult === "success";
    const fromSession = sessionStorage.getItem(PRO_CHECKOUT_SESSION_KEY) === "1";
    if (!fromUrl && !fromSession) return;

    setCelebrationOpen(true);
    setCelebrationPhase(subscriptionIsPro ? "celebrating" : "activating");

    if (!billingManager || checkoutSyncTriggered.current) return;

    checkoutSyncTriggered.current = true;
    void syncCompanyBillingState(companyId, checkoutSessionId).catch(() => undefined);
  }, [billingManager, checkoutResult, checkoutSessionId, companyId, subscriptionIsPro]);

  useEffect(() => {
    if (!celebrationOpen || celebrationPhase !== "activating") return;
    if (!subscriptionIsPro) return;

    const timer = window.setTimeout(() => {
      setCelebrationPhase("celebrating");
    }, 400);

    return () => window.clearTimeout(timer);
  }, [celebrationOpen, celebrationPhase, subscriptionIsPro]);

  useEffect(() => {
    if (!celebrationOpen || celebrationPhase !== "activating" || subscriptionIsPro) return;

    const timer = window.setTimeout(() => {
      setCelebrationPhase("celebrating");
    }, ACTIVATION_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [celebrationOpen, celebrationPhase, subscriptionIsPro]);

  useEffect(() => {
    if (!celebrationOpen || celebrationPhase !== "celebrating" || !subscriptionIsPro) return;

    void import("@/lib/knowledge/knowledge-api.client")
      .then(({ backfillKnowledge }) => backfillKnowledge(200, { force: false }))
      .catch(() => undefined);
  }, [celebrationOpen, celebrationPhase, subscriptionIsPro]);

  const requirePro = useCallback(
    (feature: ProBillingFeature, onAllowed?: () => void) => {
      if (subscriptionIsPro) {
        onAllowed?.();
        return true;
      }
      // Fires only on the refusal branch: a Pro user passing through is not a
      // paywall view, and counting it as one would make the gate look far more
      // punishing than it is.
      track("paywall_viewed", { feature });
      setPaywallFeature(feature);
      return false;
    },
    [subscriptionIsPro],
  );

  const value = useMemo(
    () => ({
      subscription,
      isPro,
      isActivating,
      isLoading,
      canManageBilling: billingManager,
      requirePro,
      error,
    }),
    [billingManager, error, isActivating, isLoading, isPro, requirePro, subscription],
  );

  return (
    <BillingGateContext.Provider value={value}>
      {children}
      <ProActivationCelebration
        open={celebrationOpen}
        phase={celebrationPhase}
        onOpenChange={(open) => {
          if (!open) dismissCelebration();
        }}
      />
      <ProPaywallDialog
        open={paywallFeature !== null}
        feature={paywallFeature}
        companyId={companyId}
        canManageBilling={billingManager}
        onOpenChange={(open) => {
          if (!open) setPaywallFeature(null);
        }}
      />
    </BillingGateContext.Provider>
  );
}

export function useBillingGate(): BillingGateContextValue {
  const context = useContext(BillingGateContext);
  if (!context) {
    throw new Error("useBillingGate must be used within BillingGateProvider");
  }
  return context;
}
