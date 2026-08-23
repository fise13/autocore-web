"use client";

import {
  initializePaddle,
  type CheckoutOpenOptions,
  type Paddle,
} from "@paddle/paddle-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { createPaddleCheckoutSession } from "@/lib/billing/paddle-checkout.client";
import { getAppOrigin } from "@/lib/app-url";
import { tryReadPaddleClientEnv } from "@/lib/paddle/read-client-env";
import { isPaddleCheckoutConfigured } from "@/lib/paddle/config";
import { paddlePriceIdForInterval, type PaddleBillingInterval } from "@/lib/paddle/prices";
import { track } from "@/lib/analytics/events";

const PRO_CHECKOUT_SESSION_KEY = "autocore-pro-checkout-pending";

type CheckoutCompletedPayload = {
  transactionId?: string;
};

type OpenCheckoutParams = {
  interval: PaddleBillingInterval;
  companyId?: string;
  customerEmail?: string | null;
  successUrl?: string;
  onCompleted?: (payload: CheckoutCompletedPayload) => void;
  onError?: (message: string) => void;
};

type PaddleCheckoutContextValue = {
  paddle: Paddle | null;
  ready: boolean;
  configured: boolean;
  openCheckout: (params: OpenCheckoutParams) => Promise<void>;
  setRetainCustomerId: (customerId: string | null | undefined) => void;
};

const PaddleCheckoutContext = createContext<PaddleCheckoutContextValue | null>(null);

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const configured = isPaddleCheckoutConfigured();
  /** Plan the open sheet is for, so `purchase` can report which one converted. */
  const checkoutIntervalRef = useRef<string | null>(null);
  const onCompletedRef = useRef<((payload: CheckoutCompletedPayload) => void) | null>(null);
  const onErrorRef = useRef<((message: string) => void) | null>(null);
  const retainCustomerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!configured) return;

    const clientEnv = tryReadPaddleClientEnv();
    if (!clientEnv) return;

    let cancelled = false;

    void initializePaddle({
      token: clientEnv.token,
      environment: clientEnv.environment,
      pwCustomer: retainCustomerIdRef.current
        ? { id: retainCustomerIdRef.current }
        : {},
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          // Paddle's own completion event, not our optimism — this cannot fire
          // for an abandoned or failed checkout. `interval` comes from the ref
          // set when the sheet was opened; no amount or customer data is sent.
          track("purchase", {
            ...(checkoutIntervalRef.current ? { interval: checkoutIntervalRef.current } : {}),
          });
          const transactionId =
            typeof event.data === "object" &&
            event.data &&
            "transaction_id" in event.data &&
            typeof event.data.transaction_id === "string"
              ? event.data.transaction_id.trim()
              : undefined;
          onCompletedRef.current?.({ transactionId: transactionId || undefined });
          onCompletedRef.current = null;
          onErrorRef.current = null;
          return;
        }

        if (event.name === "checkout.error") {
          const detail =
            typeof event.data === "object" &&
            event.data &&
            "detail" in event.data &&
            typeof event.data.detail === "string"
              ? event.data.detail
              : "Paddle checkout failed";
          onErrorRef.current?.(detail);
          onErrorRef.current = null;
        }
      },
      checkout: {
        settings: {
          variant: "one-page",
          displayMode: "overlay",
        },
      },
    }).then((instance) => {
      if (!cancelled && instance) setPaddle(instance);
    });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  const setRetainCustomerId = useCallback(
    (customerId: string | null | undefined) => {
      const normalized = customerId?.trim() || null;
      const nextCustomerId = normalized?.startsWith("ctm_") ? normalized : null;
      if (retainCustomerIdRef.current === nextCustomerId) return;

      retainCustomerIdRef.current = nextCustomerId;
      paddle?.Update({
        pwCustomer: nextCustomerId ? { id: nextCustomerId } : {},
      });
    },
    [paddle],
  );

  const openCheckout = useCallback(
    async ({
      interval,
      companyId,
      customerEmail,
      successUrl,
      onCompleted,
      onError,
    }: OpenCheckoutParams) => {
      if (!paddle) {
        throw new Error("Paddle checkout is still loading");
      }

      onCompletedRef.current = onCompleted ?? null;
      onErrorRef.current = onError ?? null;
      checkoutIntervalRef.current = interval;
      track("begin_checkout", { interval });

      const origin = getAppOrigin().replace(/\/$/, "");
      const resolvedSuccessUrl =
        successUrl ??
        (companyId
          ? `${origin}/settings?checkout=success`
          : `${typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : origin}/welcome`);

      if (companyId) {
        sessionStorage.setItem(PRO_CHECKOUT_SESSION_KEY, "1");
      }

      const settings = {
        variant: "one-page" as const,
        displayMode: "overlay" as const,
        successUrl: resolvedSuccessUrl,
      };

      try {
        const transactionId = await createPaddleCheckoutSession({
          interval,
          companyId,
          customerEmail,
          successUrl: resolvedSuccessUrl,
        });

        paddle.Checkout.open({
          transactionId,
          settings,
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start Paddle checkout";
        if (!message.includes("Paddle is not configured")) {
          throw error;
        }
      }

      const options: CheckoutOpenOptions = {
        items: [{ priceId: paddlePriceIdForInterval(interval), quantity: 1 }],
        settings,
      };

      if (companyId) {
        options.customData = { company_id: companyId };
      }

      if (customerEmail?.trim()) {
        options.customer = { email: customerEmail.trim() };
      }

      paddle.Checkout.open(options);
    },
    [paddle],
  );

  const value = useMemo(
    () => ({
      paddle,
      ready: Boolean(paddle),
      configured,
      openCheckout,
      setRetainCustomerId,
    }),
    [configured, openCheckout, paddle, setRetainCustomerId],
  );

  return <PaddleCheckoutContext.Provider value={value}>{children}</PaddleCheckoutContext.Provider>;
}

export function usePaddleCheckout(): PaddleCheckoutContextValue {
  const context = useContext(PaddleCheckoutContext);
  if (!context) {
    return {
      paddle: null,
      ready: false,
      configured: isPaddleCheckoutConfigured(),
      openCheckout: async () => {
        throw new Error("PaddleProvider is missing");
      },
      setRetainCustomerId: () => undefined,
    };
  }
  return context;
}
