"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { MixedPaymentSplit } from "@/components/accounting/mixed-payment-split";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmountInput, parseGroupedNumber } from "@/components/ui/grouped-number-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OperationAccount, PaymentMethod } from "@/domain/financial-operation";
import {
  operationAccountLabel,
  paymentMethodLabel,
} from "@/lib/accounting/labels";
import {
  accountForPaymentMethod,
  buildMixedPaymentFields,
  defaultMixedSplit,
  isValidMixedSplit,
} from "@/lib/accounting/mixed-payment";
import { formatGroupedNumber } from "@/lib/money/format-number";
import { userCopy } from "@/lib/user-copy";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";

export type SellFinancialPayload = {
  amount: number;
  account: OperationAccount;
  paymentMethod: PaymentMethod;
  cashReceived?: number | null;
  comment: string;
};

type SellFinancialDialogProps = {
  open: boolean;
  mode: "sell" | "unsell";
  title: string;
  description: string;
  defaultComment: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: SellFinancialPayload) => Promise<void>;
};

function SellFinancialDialogForm({
  mode,
  title,
  description,
  defaultComment,
  onCancel,
  onConfirm,
}: {
  mode: "sell" | "unsell";
  title: string;
  description: string;
  defaultComment: string;
  onCancel: () => void;
  onConfirm: (payload: SellFinancialPayload) => Promise<void>;
}) {
  const { toBaseAmount } = useAppDisplayCurrency();
  const [amount, setAmount] = useState(formatGroupedNumber(0));
  const [account, setAccount] = useState<OperationAccount>("cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [mixedCashPortion, setMixedCashPortion] = useState(0);
  const [comment, setComment] = useState(defaultComment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = useMemo(() => parseGroupedNumber(amount), [amount]);
  const isMixed = paymentMethod === "mixed";

  function selectPaymentMethod(next: PaymentMethod) {
    setPaymentMethod(next);
    if (next === "mixed") {
      const split = defaultMixedSplit(parsedAmount > 0 ? parsedAmount : 0);
      setMixedCashPortion(split.cash);
      setAccount(accountForPaymentMethod(next, account, split));
      return;
    }
    setAccount(accountForPaymentMethod(next, account));
  }

  useEffect(() => {
    if (!isMixed || !(parsedAmount > 0)) return;
    if (mixedCashPortion > 0 && mixedCashPortion < parsedAmount) return;
    setMixedCashPortion(defaultMixedSplit(parsedAmount).cash);
  }, [isMixed, mixedCashPortion, parsedAmount]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(userCopy.accounting.newOperation.invalidAmount);
      return;
    }
    if (isMixed && !isValidMixedSplit(parsedAmount, mixedCashPortion)) {
      setError(userCopy.accounting.newOperation.invalidMixedSplit);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const amountUsd = toBaseAmount(parsedAmount);
      const cashUsd = toBaseAmount(mixedCashPortion);
      const payment = buildMixedPaymentFields(
        paymentMethod,
        account,
        amountUsd,
        cashUsd,
      );
      await onConfirm({
        amount: amountUsd,
        account: payment.account,
        paymentMethod: payment.paymentMethod,
        cashReceived: payment.cashReceived,
        comment: comment.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : userCopy.accounting.sellFinancial.operationFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1">
          <Label>{userCopy.accounting.newOperation.amount}</Label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {!isMixed ? (
            <div className="space-y-1">
              <Label>{userCopy.accounting.newOperation.account}</Label>
              <Select value={account} onValueChange={(value) => setAccount(value as OperationAccount)}>
                <SelectTrigger>
                  <SelectValue>{operationAccountLabel(account)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashbox">{userCopy.accounting.accounts.cashbox}</SelectItem>
                  <SelectItem value="kaspi">{userCopy.accounting.accounts.kaspi}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className={isMixed ? "space-y-1 sm:col-span-2" : "space-y-1"}>
            <Label>{userCopy.accounting.newOperation.payment}</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => selectPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue>{paymentMethodLabel(paymentMethod)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{userCopy.accounting.paymentMethods.cash}</SelectItem>
                <SelectItem value="transfer">{userCopy.accounting.paymentMethods.transfer}</SelectItem>
                <SelectItem value="mixed">{userCopy.accounting.paymentMethods.mixed}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isMixed ? (
          <MixedPaymentSplit
            total={parsedAmount > 0 ? parsedAmount : 0}
            cashPortion={mixedCashPortion}
            onCashPortionChange={setMixedCashPortion}
          />
        ) : null}

        <div className="space-y-1">
          <Label>{userCopy.accounting.newOperation.comment}</Label>
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="px-0 pb-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            {userCopy.accounting.sellFinancial.cancel}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? userCopy.accounting.sellFinancial.saving
              : mode === "sell"
                ? userCopy.accounting.sellFinancial.sell
                : userCopy.accounting.sellFinancial.unsell}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function SellFinancialDialog({
  open,
  mode,
  title,
  description,
  defaultComment,
  onOpenChange,
  onConfirm,
}: SellFinancialDialogProps) {
  async function handleConfirm(payload: SellFinancialPayload) {
    await onConfirm(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md duration-300">
        <SellFinancialDialogForm
          key={`${title}-${mode}-${defaultComment}`}
          mode={mode}
          title={title}
          description={description}
          defaultComment={defaultComment}
          onCancel={() => onOpenChange(false)}
          onConfirm={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
