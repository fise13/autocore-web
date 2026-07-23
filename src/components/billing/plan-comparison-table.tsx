"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, Minus, Sparkles } from "lucide-react";

import { AnimatedUpgradeCta } from "@/components/billing/animated-upgrade-cta";
import { BillingIntervalToggle } from "@/components/billing/billing-interval-toggle";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { Badge } from "@/components/ui/badge";
import { useBillingActions } from "@/hooks/use-billing-actions";
import { formatNextBillingDate } from "@/lib/billing/format-renewal";
import { cn } from "@/lib/utils";
import { StripeBillingInterval } from "@/lib/stripe/prices";
import { userCopy } from "@/lib/user-copy";

type PlanComparisonTableProps = {
  companyId: string;
  onStatus?: (message: string | null) => void;
  embedded?: boolean;
  showTitle?: boolean;
  toggleLayoutId?: string;
};

function FeatureMark({ included, emphasize }: { included: boolean; emphasize?: boolean }) {
  if (included) {
    return (
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full",
          emphasize ? "bg-primary/15 text-primary" : "bg-muted text-foreground",
        )}
        aria-label={userCopy.billing.planComparison.yes}
      >
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground/45"
      aria-label={userCopy.billing.planComparison.no}
    >
      <Minus className="size-3.5" />
    </span>
  );
}

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
  const renewalDate = formatNextBillingDate(subscription?.currentPeriodEnd);
  const rows = userCopy.billing.planComparison.rows;
  const copy = userCopy.billing.planComparison;
  const priceAmount = interval === "monthly" ? copy.proMonthlyPrice : copy.proYearlyPrice;
  const pricePeriod = interval === "monthly" ? copy.proMonthlyPeriod : copy.proYearlyPeriod;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        embedded ? "border-primary/15 shadow-none" : "shadow-sm",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        {showTitle ? <p className="text-sm font-semibold tracking-tight">{copy.title}</p> : <span />}
        <BillingIntervalToggle
          value={interval}
          onChange={setInterval}
          layoutId={toggleLayoutId ?? (embedded ? "paywall-interval" : "plan-comparison-interval")}
        />
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
        {/* Free */}
        <div
          className={cn(
            "relative flex flex-col rounded-xl border bg-muted/15 p-4",
            !isPro && "ring-1 ring-border",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{userCopy.billing.planFree}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{copy.freeTagline}</p>
            </div>
            {!isPro ? <Badge variant="secondary">{copy.currentPlan}</Badge> : null}
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight">{copy.freePrice}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{copy.freeForever}</p>
          <ul className="mt-4 space-y-2.5 md:hidden">
            {rows.map((row) => (
              <li key={`free-${row.label}`} className="flex items-center gap-2.5 text-sm">
                <FeatureMark included={row.free} />
                <span className={cn(!row.free && "text-muted-foreground")}>{row.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div
          className={cn(
            "relative flex flex-col overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.04] p-4",
            isPro && "ring-1 ring-primary/40",
          )}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{userCopy.billing.planPro}</p>
                <Badge className="gap-1">
                  <Sparkles className="size-3" />
                  {copy.recommended}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{copy.proTagline}</p>
            </div>
            {isPro ? <Badge>{copy.currentPlan}</Badge> : null}
          </div>

          <div className="relative mt-4 min-h-[3.25rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={interval}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight">{priceAmount}</span>
                  <span className="text-sm text-muted-foreground">{pricePeriod}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.perCompany}
                  {interval === "yearly" ? ` · ${copy.proYearlyEquivalent}` : null}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {interval === "yearly" && !isPro ? (
              <motion.p
                key="yearly-hint"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              >
                {copy.yearlyHint}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <ul className="relative mt-4 space-y-2.5 md:hidden">
            {rows.map((row) => (
              <li key={`pro-${row.label}`} className="flex items-center gap-2.5 text-sm">
                <FeatureMark included={row.pro} emphasize />
                <span>{row.label}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-5 space-y-2">
            {isPro ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {userCopy.billing.nextChargeLabel}:{" "}
                  {renewalDate === "—" ? userCopy.billing.nextChargeUnknown : renewalDate}
                </p>
                {canManageBilling ? (
                  <AnimatedUpgradeCta
                    animated={false}
                    variant="outline"
                    className="w-full justify-center"
                    disabled={pending !== null || isLoading}
                    onClick={() => void openPortal()}
                  >
                    {userCopy.billing.manageButton}
                  </AnimatedUpgradeCta>
                ) : null}
              </>
            ) : canManageBilling ? (
              <AnimatedUpgradeCta
                animated
                className="w-full justify-center"
                disabled={pending !== null || isLoading}
                onClick={() => void checkout(interval)}
              >
                {copy.upgradeCta}
              </AnimatedUpgradeCta>
            ) : (
              <p className="text-xs text-muted-foreground">{userCopy.billing.askAdmin}</p>
            )}
          </div>
        </div>
      </div>

      {/* Compact matrix for larger viewports — reinforces side-by-side cards */}
      <div className="hidden border-t md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/15">
                <th className="px-5 py-2.5 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {copy.featureColumn}
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                  {userCopy.billing.planFree}
                </th>
                <th className="bg-primary/[0.04] px-4 py-2.5 text-center text-xs font-medium">
                  {userCopy.billing.planPro}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.label} className={cn("border-b last:border-b-0", index % 2 === 1 && "bg-muted/5")}>
                  <td className="px-5 py-2.5">{row.label}</td>
                  <td className="px-4 py-2.5 text-center">
                    <FeatureMark included={row.free} />
                  </td>
                  <td className="bg-primary/[0.04] px-4 py-2.5 text-center">
                    <FeatureMark included={row.pro} emphasize />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <p className="border-t px-4 py-2 text-sm text-destructive sm:px-5">{error}</p> : null}
      <p className="border-t px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        {userCopy.billing.paywallFooter}
      </p>
    </div>
  );
}
