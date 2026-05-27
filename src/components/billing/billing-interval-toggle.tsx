"use client";

import { motion } from "framer-motion";

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
    <div className={cn("inline-flex rounded-lg border bg-background p-0.5", className)}>
      {(["monthly", "yearly"] as const).map((interval) => {
        const active = value === interval;
        return (
          <button
            key={interval}
            type="button"
            onClick={() => onChange(interval)}
            className={cn(
              "relative rounded-md px-3 py-1 text-xs font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {interval === "monthly"
                ? userCopy.billing.planComparison.monthly
                : userCopy.billing.planComparison.yearly}
              {interval === "yearly" ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  {userCopy.billing.planComparison.yearlySave}
                </motion.span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
