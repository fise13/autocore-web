"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type PricingFrequency = "monthly" | "yearly";

type PricingFrequencyToggleProps = {
  value: PricingFrequency;
  onChange: (value: PricingFrequency) => void;
  monthlyLabel: string;
  yearlyLabel: string;
  yearlySave?: string;
  className?: string;
};

export function PricingFrequencyToggle({
  value,
  onChange,
  monthlyLabel,
  yearlyLabel,
  yearlySave,
  className,
}: PricingFrequencyToggleProps) {
  return (
    <div
      className={cn("marketing-pricing-frequency", className)}
      role="group"
      aria-label="Период оплаты"
    >
      {(["monthly", "yearly"] as const).map((frequency) => {
        const active = value === frequency;
        return (
          <button
            key={frequency}
            type="button"
            onClick={() => onChange(frequency)}
            aria-pressed={active}
            className={cn(
              "marketing-pricing-frequency-btn",
              active && "marketing-pricing-frequency-btn-active",
            )}
          >
            {active ? (
              <motion.span
                layoutId="marketing-pricing-frequency-pill"
                className="marketing-pricing-frequency-pill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-2">
              {frequency === "monthly" ? monthlyLabel : yearlyLabel}
              {frequency === "yearly" && yearlySave ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="marketing-pricing-frequency-save"
                >
                  {yearlySave}
                </motion.span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
