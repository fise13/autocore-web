"use client";

import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { isProSubscription } from "@/domain/billing";
import { useCompanySubscription } from "@/hooks/use-company-subscription";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CompanyPlanLabelProps = {
  companyId: string;
  isActiveCompany?: boolean;
  className?: string;
};

export function CompanyPlanLabel({
  companyId,
  isActiveCompany = false,
  className,
}: CompanyPlanLabelProps) {
  const { isPro: activeIsPro, isLoading: activeLoading } = useBillingGate();
  const inactiveSubscription = useCompanySubscription(isActiveCompany ? null : companyId);

  const isLoading = isActiveCompany ? activeLoading : inactiveSubscription.isLoading;
  const isPro = isActiveCompany
    ? activeIsPro
    : isProSubscription(inactiveSubscription.subscription);

  return (
    <p
      className={cn(
        "text-xs text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground/80",
        className,
      )}
    >
      {isLoading ? "…" : isPro ? userCopy.billing.planPro : userCopy.billing.planFree}
    </p>
  );
}
