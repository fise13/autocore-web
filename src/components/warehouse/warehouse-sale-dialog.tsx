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
import { InventoryItem } from "@/domain/inventory";
import { OperationAccount, PaymentMethod } from "@/domain/financial-operation";
import { operationAccountLabel, paymentMethodLabel } from "@/lib/accounting/labels";
import { formatGroupedNumber } from "@/lib/money/format-number";
import { userCopy } from "@/lib/user-copy";

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
  const copy = userCopy.warehouse.dialogs;
  const [quantity, setQuantity] = useState(formatGroupedNumber(1));
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState<OperationAccount>("cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    const parsedQty = parseGroupedNumber(quantity);
    const parsedAmount = parseGroupedNumber(amount);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError(copy.invalidQty);
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(copy.invalidAmount);
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
        comment: comment.trim() || copy.sale.defaultComment(item.name),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.sale.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.sale.title}</DialogTitle>
          <DialogDescription>
            {item
              ? copy.sale.available(item.sku, item.name, item.totalAvailable, item.unit)
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sale-qty">{copy.quantity}</Label>
            <AmountInput id="sale-qty" value={quantity} onChange={setQuantity} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sale-amount">{copy.sale.amount}</Label>
            <AmountInput
              id="sale-amount"
              value={amount}
              onChange={setAmount}
              placeholder={item?.sellPrice ? formatGroupedNumber(item.sellPrice) : "0"}
            />
          </div>
          <div className="grid gap-2">
            <Label>{copy.sale.account}</Label>
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
            <Label>{copy.sale.paymentMethod}</Label>
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
            <Label htmlFor="sale-comment">{copy.comment}</Label>
            <Textarea
              id="sale-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={submitting || !item}>
              {copy.sale.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
