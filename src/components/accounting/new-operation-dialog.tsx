"use client";

import { userCopy } from "@/lib/user-copy";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { ACCOUNTING_CATEGORY_SUGGESTIONS } from "@/components/accounting/accounting-categories";
import { filterAccountingCategorySuggestions } from "@/components/accounting/accounting-category-suggestions";
import { MixedPaymentSplit } from "@/components/accounting/mixed-payment-split";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AmountInput, parseGroupedNumber } from "@/components/ui/grouped-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CREATABLE_OPERATION_TYPES,
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
  paymentMethodLabel,
  resolveOperationCategoryValue,
} from "@/lib/accounting/labels";
import { appendAdvanceMarker } from "@/lib/accounting/advances";
import {
  accountForPaymentMethod,
  buildMixedPaymentFields,
  defaultMixedSplit,
  isValidMixedSplit,
} from "@/lib/accounting/mixed-payment";
import { formatGroupedNumber } from "@/lib/money/format-number";
import {
  OPERATION_ACCOUNTS,
  PAYMENT_METHODS,
  OperationAccount,
  OperationType,
  PaymentMethod,
} from "@/domain/financial-operation";

type NewOperationDialogProps = {
  categorySuggestions?: string[];
  onCreate: (input: {
    type: OperationType;
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    cashReceived?: number | null;
    category?: string | null;
    comment?: string | null;
  }) => Promise<void>;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultType?: OperationType;
  hideTrigger?: boolean;
};

export function NewOperationDialog({
  categorySuggestions = [...ACCOUNTING_CATEGORY_SUGGESTIONS],
  onCreate,
  disabled = false,
  open: openProp,
  onOpenChange,
  defaultType = "expense",
  hideTrigger = false,
}: NewOperationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<OperationType>(defaultType);

  useEffect(() => {
    if (open) {
      setType(defaultType);
    }
  }, [defaultType, open]);
  const [amount, setAmount] = useState(formatGroupedNumber(0));
  const [account, setAccount] = useState<OperationAccount>("cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [mixedCashPortion, setMixedCashPortion] = useState(0);
  const [categoryInput, setCategoryInput] = useState("");
  const [comment, setComment] = useState("");
  const [markAsAdvance, setMarkAsAdvance] = useState(false);

  const parsedAmount = useMemo(() => parseGroupedNumber(amount), [amount]);
  const visibleSuggestions = useMemo(
    () => filterAccountingCategorySuggestions(categoryInput, categorySuggestions).slice(0, 12),
    [categoryInput, categorySuggestions],
  );
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
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
      const normalized = markAsAdvance
        ? appendAdvanceMarker(resolveOperationCategoryValue(categoryInput), comment)
        : {
            category: resolveOperationCategoryValue(categoryInput),
            comment: comment.trim(),
          };

      const payment = buildMixedPaymentFields(
        paymentMethod,
        account,
        parsedAmount,
        mixedCashPortion,
      );

      await onCreate({
        type,
        amount: parsedAmount,
        account: payment.account,
        paymentMethod: payment.paymentMethod,
        cashReceived: payment.cashReceived,
        category: normalized.category || null,
        comment: normalized.comment || null,
      });
      setOpen(false);
      setAmount(formatGroupedNumber(0));
      setCategoryInput("");
      setComment("");
      setMarkAsAdvance(false);
      setType("expense");
      setPaymentMethod("cash");
      setAccount("cashbox");
      setMixedCashPortion(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : userCopy.accounting.newOperation.createFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <DialogTrigger render={<Button disabled={disabled}>{userCopy.accounting.newOperation.trigger}</Button>} />
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{userCopy.accounting.newOperation.title}</DialogTitle>
          <DialogDescription>{userCopy.accounting.newOperation.description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{userCopy.accounting.newOperation.type}</Label>
              <Select value={type} onValueChange={(value) => setType(value as OperationType)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{operationTypeLabel(type)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CREATABLE_OPERATION_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {operationTypeLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{userCopy.accounting.newOperation.amount}</Label>
              <AmountInput
                value={amount}
                onChange={setAmount}
                placeholder="0"
              />
            </div>

            {!isMixed ? (
              <div className="space-y-1">
                <Label>{userCopy.accounting.newOperation.account}</Label>
                <Select value={account} onValueChange={(value) => setAccount(value as OperationAccount)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{operationAccountLabel(account)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATION_ACCOUNTS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {operationAccountLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className={cnMixedPaymentClass(isMixed)}>
              <Label>{userCopy.accounting.newOperation.payment}</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => selectPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{paymentMethodLabel(paymentMethod)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {paymentMethodLabel(item)}
                    </SelectItem>
                  ))}
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
            <Label>{userCopy.accounting.newOperation.category}</Label>
            <Input
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
              onBlur={() => {
                const resolved = resolveOperationCategoryValue(categoryInput);
                setCategoryInput(operationCategoryLabel(resolved === "—" ? "" : resolved));
              }}
              placeholder={userCopy.accounting.newOperation.categoryPlaceholder}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {visibleSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border bg-background px-2.5 py-1 text-xs transition hover:bg-muted"
                  onClick={() => setCategoryInput(operationCategoryLabel(item))}
                >
                  {operationCategoryLabel(item)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>{userCopy.accounting.newOperation.comment}</Label>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={userCopy.accounting.newOperation.commentPlaceholder}
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={markAsAdvance}
              onChange={(event) => setMarkAsAdvance(event.target.checked)}
              className="size-4 rounded border"
            />
            <span>{userCopy.accounting.newOperation.markAdvance}</span>
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="px-0 pt-0 pb-0">
            <Button type="submit" disabled={submitting}>
              {submitting ? userCopy.accounting.newOperation.saving : userCopy.accounting.newOperation.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function cnMixedPaymentClass(isMixed: boolean): string {
  return isMixed ? "space-y-1 sm:col-span-2" : "space-y-1";
}
