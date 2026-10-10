"use client";

import { useEffect, useMemo, useState } from "react";

import { AmountInput, parseGroupedNumber } from "@/components/ui/grouped-number-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  defaultMixedSplit,
  isValidMixedSplit,
  roundMoney,
  splitFromCashPortion,
  splitFromTransferPortion,
} from "@/lib/accounting/mixed-payment";
import { formatGroupedNumber } from "@/lib/money/format-number";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type MixedPaymentSplitProps = {
  total: number;
  cashPortion: number;
  onCashPortionChange: (cash: number) => void;
  className?: string;
};

export function MixedPaymentSplit({
  total,
  cashPortion,
  onCashPortionChange,
  className,
}: MixedPaymentSplitProps) {
  const split = useMemo(() => splitFromCashPortion(total, cashPortion), [cashPortion, total]);
  const valid = isValidMixedSplit(total, split.cash);
  const cashRatio = total > 0 ? Math.min(1, Math.max(0, split.cash / total)) : 0.5;

  const [cashText, setCashText] = useState(() => formatGroupedNumber(split.cash));
  const [transferText, setTransferText] = useState(() => formatGroupedNumber(split.transfer));

  useEffect(() => {
    setCashText(formatGroupedNumber(roundMoney(split.cash)));
    setTransferText(formatGroupedNumber(roundMoney(split.transfer)));
  }, [split.cash, split.transfer]);

  function commitCash(raw: string) {
    const parsed = parseGroupedNumber(raw);
    if (!Number.isFinite(parsed)) return;
    const next = splitFromCashPortion(total, parsed);
    onCashPortionChange(next.cash);
  }

  function commitTransfer(raw: string) {
    const parsed = parseGroupedNumber(raw);
    if (!Number.isFinite(parsed)) return;
    const next = splitFromTransferPortion(total, parsed);
    onCashPortionChange(next.cash);
  }

  function splitEvenly() {
    onCashPortionChange(defaultMixedSplit(total).cash);
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border/80 bg-muted/15 p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{userCopy.accounting.newOperation.mixedTitle}</p>
          <p className="text-xs text-muted-foreground">{userCopy.accounting.newOperation.mixedHint}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={splitEvenly}>
          {userCopy.accounting.newOperation.mixedSplitEvenly}
        </Button>
      </div>

      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-success transition-[width] duration-200"
          style={{ width: `${cashRatio * 100}%` }}
        />
        <div className="h-full flex-1 bg-primary" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{userCopy.accounting.newOperation.mixedCash}</Label>
          <AmountInput
            value={cashText}
            onChange={(value) => {
              setCashText(value);
              const parsed = parseGroupedNumber(value);
              if (Number.isFinite(parsed)) {
                onCashPortionChange(splitFromCashPortion(total, parsed).cash);
              }
            }}
            onBlur={() => commitCash(cashText)}
          />
        </div>
        <div className="space-y-1">
          <Label>{userCopy.accounting.newOperation.mixedTransfer}</Label>
          <AmountInput
            value={transferText}
            onChange={(value) => {
              setTransferText(value);
              const parsed = parseGroupedNumber(value);
              if (Number.isFinite(parsed)) {
                onCashPortionChange(splitFromTransferPortion(total, parsed).cash);
              }
            }}
            onBlur={() => commitTransfer(transferText)}
          />
        </div>
      </div>

      <p className={cn("text-xs", valid ? "text-muted-foreground" : "text-destructive")}>
        {valid
          ? userCopy.accounting.newOperation.mixedBalanced
          : userCopy.accounting.newOperation.invalidMixedSplit}
      </p>
    </div>
  );
}
