"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { SellFinancialDialog, SellFinancialPayload } from "@/components/accounting/sell-financial-dialog";
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
import { MotorEntity } from "@/domain/motor";
import { OperationAccount, PaymentMethod } from "@/domain/financial-operation";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import {
  operationAccountLabel,
  paymentMethodLabel,
} from "@/lib/accounting/labels";
import { formatWarrantyDurationLabel } from "@/lib/documents/warranty/custom-warranty";
import type { MotorSaleWarrantyOverride } from "@/lib/documents/warranty/custom-warranty";
import { formatGroupedNumber } from "@/lib/money/format-number";

export type MotorSellPayload = SellFinancialPayload & {
  warrantyOverride?: MotorSaleWarrantyOverride;
};

type SellMotorDialogProps = {
  companyId: string | null | undefined;
  motor: MotorEntity | null;
  mode: "sell" | "unsell";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: MotorSellPayload) => Promise<void>;
};

function SellMotorDialogForm({
  companyId,
  motor,
  mode,
  onCancel,
  onConfirm,
}: {
  companyId: string | null | undefined;
  motor: MotorEntity;
  mode: "sell" | "unsell";
  onCancel: () => void;
  onConfirm: (payload: MotorSellPayload) => Promise<void>;
}) {
  const { profile } = useCompanyBranding(companyId);
  const usesCustomWarranty = profile.warrantyTemplateId === "custom" && mode === "sell";

  const defaultMonths = profile.customWarrantyMonths ? String(profile.customWarrantyMonths) : "6";
  const defaultKm = profile.customWarrantyKm ? String(profile.customWarrantyKm) : "10000";

  const [amount, setAmount] = useState(formatGroupedNumber(0));
  const [account, setAccount] = useState<OperationAccount>("cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [comment, setComment] = useState(
    mode === "sell" ? `Продажа · ${motor.serialCode}` : `Возврат · ${motor.serialCode}`,
  );
  const [warrantyMonths, setWarrantyMonths] = useState(defaultMonths);
  const [warrantyKm, setWarrantyKm] = useState(defaultKm);
  const [warrantyLabel, setWarrantyLabel] = useState(profile.warrantyLabel ?? "");
  const [warrantyText, setWarrantyText] = useState(profile.warrantyText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWarrantyMonths(defaultMonths);
    setWarrantyKm(defaultKm);
    setWarrantyLabel(profile.warrantyLabel ?? "");
    setWarrantyText(profile.warrantyText ?? "");
  }, [defaultMonths, defaultKm, profile.warrantyLabel, profile.warrantyText, motor.id, mode]);

  const parsedAmount = useMemo(() => parseGroupedNumber(amount), [amount]);
  const parsedMonths = Number(warrantyMonths);
  const parsedKm = Number(warrantyKm);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Введите корректную сумму");
      return;
    }

    if (usesCustomWarranty) {
      if (!Number.isFinite(parsedMonths) || parsedMonths <= 0) {
        setError("Укажите срок гарантии в месяцах");
        return;
      }
      if (!Number.isFinite(parsedKm) || parsedKm <= 0) {
        setError("Укажите пробег гарантии в км");
        return;
      }
      if (!warrantyText.trim()) {
        setError("Введите текст гарантии для этой продажи");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const label =
        warrantyLabel.trim() ||
        (usesCustomWarranty
          ? formatWarrantyDurationLabel(parsedMonths, parsedKm)
          : undefined);

      await onConfirm({
        amount: parsedAmount,
        account,
        paymentMethod,
        comment: comment.trim(),
        warrantyOverride: usesCustomWarranty
          ? {
              warrantyLabel: label,
              warrantyText: warrantyText.trim(),
              customWarrantyMonths: parsedMonths,
              customWarrantyKm: parsedKm,
            }
          : undefined,
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
        <DialogTitle>{mode === "sell" ? "Продажа мотора" : "Возврат мотора"}</DialogTitle>
        <DialogDescription>
          Мотор {motor.serialCode}. Будет создана одна финансовая операция
          {usesCustomWarranty ? " и гарантийный талон с вашими условиями" : ""}.
        </DialogDescription>
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

        {usesCustomWarranty ? (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-medium">Гарантия на эту продажу</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sale-warranty-months">Срок, мес</Label>
                <Input
                  id="sale-warranty-months"
                  type="number"
                  min={1}
                  value={warrantyMonths}
                  onChange={(event) => setWarrantyMonths(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sale-warranty-km">Пробег, км</Label>
                <Input
                  id="sale-warranty-km"
                  type="number"
                  min={1}
                  value={warrantyKm}
                  onChange={(event) => setWarrantyKm(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sale-warranty-label">Заголовок (необязательно)</Label>
              <Input
                id="sale-warranty-label"
                value={warrantyLabel}
                onChange={(event) => setWarrantyLabel(event.target.value)}
                placeholder={formatWarrantyDurationLabel(parsedMonths || 6, parsedKm || 10_000)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sale-warranty-text">Условия гарантии</Label>
              <Textarea
                id="sale-warranty-text"
                value={warrantyText}
                onChange={(event) => setWarrantyText(event.target.value)}
                rows={5}
                placeholder="Каждый абзац — с новой строки"
              />
            </div>
          </div>
        ) : null}

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

export function SellMotorDialog({
  companyId,
  motor,
  mode,
  open,
  onOpenChange,
  onConfirm,
}: SellMotorDialogProps) {
  async function handleConfirm(payload: MotorSellPayload) {
    await onConfirm(payload);
    onOpenChange(false);
  }

  if (!motor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md duration-300">
          <DialogHeader>
            <DialogTitle>Продажа мотора</DialogTitle>
            <DialogDescription>Выберите мотор для операции.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md duration-300">
        <SellMotorDialogForm
          key={`${motor.id}-${mode}`}
          companyId={companyId}
          motor={motor}
          mode={mode}
          onCancel={() => onOpenChange(false)}
          onConfirm={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
