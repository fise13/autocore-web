"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Check, Minus } from "lucide-react";

import { AnimatedUpgradeCta } from "@/components/billing/animated-upgrade-cta";
import { BillingIntervalToggle } from "@/components/billing/billing-interval-toggle";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Badge } from "@/components/ui/badge";
import { useBillingActions } from "@/hooks/use-billing-actions";
import { formatNextBillingDate } from "@/lib/billing/format-renewal";
import { cn } from "@/lib/utils";
import { isStripeBillingConfigured, StripeBillingInterval } from "@/lib/stripe/prices";
import { userCopy } from "@/lib/user-copy";

type PlanComparisonTableProps = {
  companyId: string;
  onStatus?: (message: string | null) => void;
  embedded?: boolean;
  showTitle?: boolean;
  toggleLayoutId?: string;
};

export function PlanComparisonTable({
  companyId,
  onStatus,
  embedded = false,
  showTitle = true,
  toggleLayoutId,
}: PlanComparisonTableProps) {
  const { subscription, isPro, isLoading, canManageBilling, error } = useBillingGate();
  const { pending, checkout, openPortal } = useBillingActions({
    companyId,
    onStatus,
    syncOnPortalReturn: false,
  });
  const [interval, setInterval] = useState<StripeBillingInterval>("monthly");
  const stripeReady = isStripeBillingConfigured();
  const renewalDate = formatNextBillingDate(subscription?.currentPeriodEnd);
  const rows = userCopy.billing.planComparison.rows;
  const priceCopy =
    interval === "monthly"
      ? userCopy.billing.planComparison.proMonthlyPrice
      : userCopy.billing.planComparison.proYearlyPrice;

  return (
    <div className={cn("overflow-hidden rounded-xl border", embedded && "border-primary/15 shadow-none")}>
      {showTitle ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium">{userCopy.billing.planComparison.title}</p>
          <BillingIntervalToggle
            value={interval}
            onChange={setInterval}
            layoutId={toggleLayoutId ?? "plan-comparison-interval"}
          />
        </div>
      ) : (
        <div className="flex justify-end border-b bg-muted/10 px-4 py-3">
          <BillingIntervalToggle
            value={interval}
            onChange={setInterval}
            layoutId={toggleLayoutId ?? "paywall-interval"}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b bg-muted/10">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {userCopy.billing.planComparison.featureColumn}
              </th>
              <th className="px-4 py-3 text-center font-medium">{userCopy.billing.planFree}</th>
              <th className="px-4 py-3 text-center font-medium">{userCopy.billing.planPro}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <motion.tr
                key={row.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.24 }}
                className={cn("border-b last:border-b-0", index % 2 === 1 && "bg-muted/5")}
              >
                <td className="px-4 py-3">{row.label}</td>
                <td className="px-4 py-3 text-center">
                  {row.free ? (
                    <Check className="mx-auto size-4 text-primary" aria-label="Да" />
                  ) : (
                    <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Нет" />
                  )}
                </td>
                <td className="bg-primary/5 px-4 py-3 text-center">
                  {row.pro ? (
                    <Check className="mx-auto size-4 text-primary" aria-label="Да" />
                  ) : (
                    <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Нет" />
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/10">
              <td className="px-4 py-4" />
              <td className="px-4 py-4 text-center align-top">
                {!isPro ? (
                  <Badge variant="secondary">{userCopy.billing.planComparison.currentPlan}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{userCopy.billing.planFree}</span>
                )}
              </td>
              <td className="bg-primary/5 px-4 py-4 text-center align-top">
                <div className="space-y-3">
                  <div className="relative min-h-8 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={interval}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="text-lg font-semibold tracking-tight"
                      >
                        {priceCopy}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <AnimatePresence mode="wait">
                    {interval === "yearly" && !isPro ? (
                      <motion.p
                        key="yearly-hint"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-emerald-700 dark:text-emerald-400"
                      >
                        {userCopy.billing.planComparison.yearlyHint}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                  {isPro ? (
                    <>
                      <Badge>{userCopy.billing.planComparison.currentPlan}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {userCopy.billing.nextChargeLabel}:{" "}
                        {renewalDate === "—" ? userCopy.billing.nextChargeUnknown : renewalDate}
                      </p>
                      {canManageBilling && stripeReady ? (
                        <AnimatedUpgradeCta
                          animated={false}
                          variant="outline"
                          pending={pending === "portal"}
                          disabled={pending !== null || isLoading}
                          onClick={() => void openPortal()}
                        >
                          {userCopy.billing.manageButton}
                        </AnimatedUpgradeCta>
                      ) : null}
                    </>
                  ) : canManageBilling && stripeReady ? (
                    <AnimatedUpgradeCta
                      animated
                      pending={pending === interval}
                      disabled={pending !== null || isLoading}
                      onClick={() => void checkout(interval)}
                    >
                      {userCopy.billing.planComparison.upgradeCta}
                    </AnimatedUpgradeCta>
                  ) : (
                    <p className="text-xs text-muted-foreground">{userCopy.billing.askAdmin}</p>
                  )}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {error ? <p className="border-t px-4 py-2 text-sm text-destructive">{error}</p> : null}
      {!stripeReady && canManageBilling ? (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">{userCopy.billing.notConfigured}</p>
      ) : null}
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">{userCopy.billing.paywallFooter}</p>
    </div>
  );
}
