"use client";

import { motion } from "motion/react";

import { StripeBillingInterval } from "@/lib/stripe/prices";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

type BillingIntervalToggleProps = {
  value: StripeBillingInterval;
  onChange: (value: StripeBillingInterval) => void;
  layoutId?: string;
  className?: string;
};

export function BillingIntervalToggle({
  value,
  onChange,
  layoutId = "billing-interval-pill",
  className,
}: BillingIntervalToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border bg-muted/40 p-1 shadow-inner",
        className,
      )}
      role="group"
      aria-label={userCopy.billing.planComparison.billingInterval}
    >
      {(["monthly", "yearly"] as const).map((interval) => {
        const active = value === interval;
        return (
          <button
            key={interval}
            type="button"
            onClick={() => onChange(interval)}
            aria-pressed={active}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {interval === "monthly"
                ? userCopy.billing.planComparison.monthly
                : userCopy.billing.planComparison.yearly}
              {interval === "yearly" ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-micro font-semibold",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-success-subtle text-success-on-subtle",
                  )}
                >
                  {userCopy.billing.planComparison.yearlySave}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
