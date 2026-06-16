"use client";

import { ChevronRight } from "lucide-react";

import { AnimatedUpgradeCta } from "@/components/billing/animated-upgrade-cta";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Badge } from "@/components/ui/badge";
import { formatNextBillingDate } from "@/lib/billing/format-renewal";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type SubscriptionStripProps = {
  className?: string;
};

export function SubscriptionStrip({ className }: SubscriptionStripProps) {
  const { subscription, isPro, isLoading, canManageBilling } = useBillingGate();
  const renewalDate = formatNextBillingDate(subscription?.currentPeriodEnd);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/10 px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isLoading ? (
          <Badge variant="secondary">…</Badge>
        ) : (
          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro ? userCopy.billing.planPro : userCopy.billing.planFree}
          </Badge>
        )}
        <p className="truncate text-sm text-muted-foreground">
          {isPro
            ? subscription?.status === "trialing" && renewalDate !== "—"
              ? userCopy.billing.trialingHint(renewalDate)
              : renewalDate === "—"
                ? userCopy.billing.proActiveHint
                : `${userCopy.billing.nextChargeLabel}: ${renewalDate}`
            : userCopy.billing.freeActiveHint}
        </p>
      </div>
      {canManageBilling ? (
        isPro ? (
          <AnimatedUpgradeCta
            animated={false}
            href="/settings?section=company&plans=1"
            variant="outline"
            className="shrink-0"
          >
            {userCopy.billing.manageButton}
            <ChevronRight className="size-4" />
          </AnimatedUpgradeCta>
        ) : (
          <AnimatedUpgradeCta
            animated
            href="/settings?section=company&plans=1"
            className="shrink-0"
          >
            {userCopy.billing.viewPlans}
            <ChevronRight className="size-4" />
          </AnimatedUpgradeCta>
        )
      ) : (
        <p className="text-xs text-muted-foreground">{userCopy.billing.askAdmin}</p>
      )}
    </div>
  );
}
