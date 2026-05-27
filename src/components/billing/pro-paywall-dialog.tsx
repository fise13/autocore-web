"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CreditCard, Sparkles } from "lucide-react";

import { PlanComparisonTable } from "@/components/billing/plan-comparison-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProBillingFeature } from "@/lib/billing/entitlements";
import { userCopy } from "@/lib/user-copy";

type ProPaywallDialogProps = {
  open: boolean;
  feature: ProBillingFeature | null;
  companyId: string;
  canManageBilling: boolean;
  stripeReady: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProPaywallDialog({
  open,
  feature,
  companyId,
  canManageBilling,
  stripeReady,
  onOpenChange,
}: ProPaywallDialogProps) {
  const paywall = feature ? userCopy.billing.paywall[feature] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-primary/15 p-0 sm:max-w-3xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/12 to-transparent" />
        <div className="relative space-y-4 p-6">
          <DialogHeader className="space-y-3 text-center sm:text-left">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="flex items-center justify-center gap-2 sm:justify-start"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <Badge variant="secondary">{userCopy.billing.planPro}</Badge>
            </motion.div>
            <DialogTitle className="text-xl">{paywall?.title ?? userCopy.billing.paywallTitle}</DialogTitle>
            <DialogDescription>{paywall?.description ?? userCopy.billing.description}</DialogDescription>
          </DialogHeader>

          {canManageBilling && stripeReady ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.32 }}
            >
              <PlanComparisonTable
                companyId={companyId}
                embedded
                showTitle={false}
                toggleLayoutId="paywall-dialog-interval"
              />
            </motion.div>
          ) : (
            <div className="space-y-3 rounded-xl border bg-muted/15 p-4 text-center">
              <p className="text-sm text-muted-foreground">{userCopy.billing.askAdmin}</p>
              <Link
                href="/settings?section=company&plans=1"
                className={buttonVariants({ variant: "secondary" })}
              >
                {userCopy.billing.openSettings}
              </Link>
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <CreditCard className="size-3.5" />
            {userCopy.billing.paywallFooter}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
