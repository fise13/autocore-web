"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { InventoryItem } from "@/domain/inventory";
import { OperationAccount, PaymentMethod } from "@/domain/financial-operation";
import { operationAccountLabel, paymentMethodLabel } from "@/lib/accounting/labels";

type WarehouseSaleDialogProps = {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    quantity: number;
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    comment: string;
  }) => Promise<void>;
};

export function WarehouseSaleDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: WarehouseSaleDialogProps) {
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState<OperationAccount>("cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    const parsedQty = Number(quantity);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError("Укажите корректное количество");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Укажите корректную сумму");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        quantity: parsedQty,
        amount: parsedAmount,
        account,
        paymentMethod,
        comment: comment.trim() || `Продажа: ${item.name}`,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ошибка продажи");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Продажа со склада</DialogTitle>
          <DialogDescription>
            {item ? `${item.sku} · ${item.name} · доступно ${item.totalAvailable} ${item.unit}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sale-qty">Количество</Label>
            <Input
              id="sale-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sale-amount">Сумма</Label>
            <Input
              id="sale-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={item?.sellPrice ? String(item.sellPrice) : "0"}
            />
          </div>
          <div className="grid gap-2">
            <Label>Счёт</Label>
            <Select value={account} onValueChange={(value) => setAccount(value as OperationAccount)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashbox">{operationAccountLabel("cashbox")}</SelectItem>
                <SelectItem value="kaspi">{operationAccountLabel("kaspi")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Способ оплаты</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{paymentMethodLabel("cash")}</SelectItem>
                <SelectItem value="transfer">{paymentMethodLabel("transfer")}</SelectItem>
                <SelectItem value="mixed">{paymentMethodLabel("mixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sale-comment">Комментарий</Label>
            <Textarea id="sale-comment" value={comment} onChange={(event) => setComment(event.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting || !item}>
              Подтвердить продажу
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
