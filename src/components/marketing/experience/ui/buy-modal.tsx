"use client";

import { Button } from "@/components/ui/button";
import { PaddleBuyButton } from "@/components/marketing/pricing/paddle-buy-button";
import { useLandingContent } from "@/components/marketing/experience/content/use-landing-content";

type PaddleBuyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** @deprecated Use PaddleBuyButton directly. Kept for callers that still toggle open state. */
export function BuyModal({ open, onOpenChange }: PaddleBuyModalProps) {
  const { pricing } = useLandingContent();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{pricing.buyModal.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{pricing.buyModal.body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {pricing.buyModal.close}
          </Button>
          <PaddleBuyButton onSubscribed={() => onOpenChange(false)}>{pricing.buy}</PaddleBuyButton>
        </div>
      </div>
    </div>
  );
}
