"use client";

import { PayrollTransactionStatus } from "@/domain/payroll-transaction";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type MyEarningsStatusFilterProps = {
  value: PayrollTransactionStatus | "all";
  onChange: (value: PayrollTransactionStatus | "all") => void;
};

const options: Array<{ value: PayrollTransactionStatus | "all"; label: string }> = [
  { value: "all", label: userCopy.myEarnings.filters.all },
  { value: "pending", label: userCopy.myEarnings.filters.pending },
  { value: "paid", label: userCopy.myEarnings.filters.paid },
  { value: "cancelled", label: userCopy.myEarnings.filters.cancelled },
];

export function MyEarningsStatusFilter({ value, onChange }: MyEarningsStatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
