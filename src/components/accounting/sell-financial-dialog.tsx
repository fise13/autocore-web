"use client";

import { FormEvent, useMemo, useState } from "react";

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
import { formatGroupedNumber } from "@/lib/money/format-number";

export type SellFinancialPayload = {
  amount: number;
  account: OperationAccount;
  paymentMethod: PaymentMethod;
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
  const [amount, setAmount] = useState(formatGroupedNumber(0));
  const [account, setAccount] = useState<OperationAccount>("cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [comment, setComment] = useState(defaultComment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = useMemo(() => parseGroupedNumber(amount), [amount]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Введите корректную сумму");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        amount: parsedAmount,
        account,
        paymentMethod,
        comment: comment.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить операцию");
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
          <Label>Сумма</Label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Счёт</Label>
            <Select value={account} onValueChange={(value) => setAccount(value as OperationAccount)}>
              <SelectTrigger>
                <SelectValue>{operationAccountLabel(account)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashbox">Касса</SelectItem>
                <SelectItem value="kaspi">Kaspi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Оплата</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue>{paymentMethodLabel(paymentMethod)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Наличные</SelectItem>
                <SelectItem value="transfer">Перевод</SelectItem>
                <SelectItem value="mixed">Смешанная</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Комментарий</Label>
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="px-0 pb-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Сохраняем..." : mode === "sell" ? "Продать" : "Вернуть"}
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
