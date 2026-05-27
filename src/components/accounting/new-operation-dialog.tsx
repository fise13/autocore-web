"use client";

import { FormEvent, useMemo, useState } from "react";

import { ACCOUNTING_CATEGORY_SUGGESTIONS } from "@/components/accounting/accounting-categories";
import { filterAccountingCategorySuggestions } from "@/components/accounting/accounting-category-suggestions";
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
  operationTypeLabel,
  paymentMethodLabel,
} from "@/lib/accounting/labels";
import { appendAdvanceMarker } from "@/lib/accounting/advances";
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
    category?: string | null;
    comment?: string | null;
  }) => Promise<void>;
  disabled?: boolean;
};

export function NewOperationDialog({
  categorySuggestions = [...ACCOUNTING_CATEGORY_SUGGESTIONS],
  onCreate,
  disabled = false,
}: NewOperationDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<OperationType>("expense");
  const [amount, setAmount] = useState("0");
  const [account, setAccount] = useState<OperationAccount>("cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");
  const [markAsAdvance, setMarkAsAdvance] = useState(false);

  const parsedAmount = useMemo(() => Number(amount), [amount]);
  const visibleSuggestions = useMemo(
    () => filterAccountingCategorySuggestions(category, categorySuggestions).slice(0, 12),
    [category, categorySuggestions],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Введите корректную сумму");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const normalized = markAsAdvance
        ? appendAdvanceMarker(category, comment)
        : { category: category.trim(), comment: comment.trim() };

      await onCreate({
        type,
        amount: parsedAmount,
        account,
        paymentMethod,
        category: normalized.category || null,
        comment: normalized.comment || null,
      });
      setOpen(false);
      setAmount("0");
      setCategory("");
      setComment("");
      setMarkAsAdvance(false);
      setType("expense");
      setPaymentMethod("cash");
      setAccount("cashbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать операцию");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disabled}>Новая операция</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Новая операция</DialogTitle>
          <DialogDescription>Добавьте финансовую операцию в журнал компании.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Тип</Label>
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
              <Label>Сумма</Label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1">
              <Label>Счёт</Label>
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

            <div className="space-y-1">
              <Label>Оплата</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
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

          <div className="space-y-1">
            <Label>Категория</Label>
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Например: зарплата Сане"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {visibleSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border bg-background px-2.5 py-1 text-xs transition hover:bg-muted"
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Комментарий</Label>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Комментарий к операции"
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
            <span>Пометить как аванс</span>
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="px-0 pt-0 pb-0">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Сохраняем..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
