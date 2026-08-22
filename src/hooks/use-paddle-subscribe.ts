"use client";

import { useCallback } from "react";

import { usePaddleCheckout } from "@/components/billing/paddle-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { syncCompanyBillingState } from "@/lib/billing/sync-company-billing.client";
import { type PaddleBillingInterval } from "@/lib/paddle/prices";
import { userCopy } from "@/lib/user-copy";

type SubscribeOptions = {
  interval?: PaddleBillingInterval;
  companyId?: string;
  successUrl?: string;
  syncAfterComplete?: boolean;
};

export function usePaddleSubscribe() {
  const { profile } = useAuth();
  const { ready, configured, openCheckout } = usePaddleCheckout();
  const { toast } = useToast();

  const subscribe = useCallback(
    async ({
      interval = "monthly",
      companyId,
      successUrl,
      syncAfterComplete = Boolean(companyId),
    }: SubscribeOptions = {}) => {
      if (!configured) {
        toast({
          title: userCopy.billing.paymentUnavailableTitle,
          description: "Paddle is not configured. Set NEXT_PUBLIC_PADDLE_* in .env.local.",
        });
        return false;
      }

      if (!ready) {
        toast({
          title: userCopy.billing.paymentUnavailableTitle,
          description: "Checkout is still loading. Try again in a moment.",
        });
        return false;
      }

      try {
        await openCheckout({
          interval,
          companyId,
          customerEmail: profile?.email ?? null,
          successUrl,
          onCompleted: syncAfterComplete && companyId
            ? ({ transactionId }) => {
                void syncCompanyBillingState(companyId, undefined, transactionId).catch(() => undefined);
              }
            : undefined,
          onError: (message) => {
            toast({
              title: userCopy.billing.paymentUnavailableTitle,
              description: message,
            });
          },
        });
        return true;
      } catch (error) {
        toast({
          title: userCopy.billing.paymentUnavailableTitle,
          description: error instanceof Error ? error.message : userCopy.billing.paymentUnavailable,
        });
        return false;
      }
    },
    [configured, openCheckout, profile?.email, ready, toast],
  );

  return { subscribe, ready, configured };
}
