"use client";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CompanyPlanLabelProps = {
  /** Only the active company has subscription context in BillingGateProvider. */
  isActiveCompany: boolean;
  className?: string;
};

export function CompanyPlanLabel({ isActiveCompany, className }: CompanyPlanLabelProps) {
  const { isPro, isLoading } = useBillingGate();

  if (!isActiveCompany) return null;

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {isLoading ? "…" : isPro ? userCopy.billing.planPro : userCopy.billing.planFree}
    </p>
  );
}
