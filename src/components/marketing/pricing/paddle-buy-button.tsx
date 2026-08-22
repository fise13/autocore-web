"use client";

import { type ComponentProps, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePaddleSubscribe } from "@/hooks/use-paddle-subscribe";
import { type PaddleBillingInterval } from "@/lib/paddle/prices";

type PaddleBuyButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  interval?: PaddleBillingInterval;
  companyId?: string;
  successUrl?: string;
  onSubscribed?: () => void;
};

function defaultSuccessUrl(): string {
  if (typeof window === "undefined") return "/welcome";
  return `${window.location.origin.replace(/\/$/, "")}/welcome`;
}

export function PaddleBuyButton({
  interval = "monthly",
  companyId,
  successUrl,
  onSubscribed,
  disabled,
  children,
  ...props
}: PaddleBuyButtonProps) {
  const { subscribe, ready, configured } = usePaddleSubscribe();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      disabled={disabled || pending || !configured || !ready}
      onClick={() => {
        setPending(true);
        void subscribe({
          interval,
          companyId,
          successUrl: successUrl ?? defaultSuccessUrl(),
          syncAfterComplete: Boolean(companyId),
        })
          .then((ok) => {
            if (ok) onSubscribed?.();
          })
          .finally(() => setPending(false));
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
