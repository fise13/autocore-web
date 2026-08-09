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
import { DatalistInput } from "@/components/ui/datalist-input";
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
import { useToast } from "@/components/ui/toast-provider";
import { KnowledgeSuggestionChips } from "@/components/knowledge/knowledge-suggestion-chips";
import { MotorEntity } from "@/domain/motor";
import type { KnowledgeSuggestion } from "@/domain/knowledge/types";
import { OperationAccount, PaymentMethod } from "@/domain/financial-operation";
import {
  accountForPaymentMethod,
  buildMixedPaymentFields,
  defaultMixedSplit,
  isValidMixedSplit,
} from "@/lib/accounting/mixed-payment";
import { useClientsRealtime } from "@/hooks/use-clients-realtime";
import { MixedPaymentSplit } from "@/components/accounting/mixed-payment-split";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { useKnowledgeSuggestions } from "@/hooks/use-knowledge-suggestions";
import { createClientRepository } from "@/infrastructure/firestore/client-repository";
import { formatWarrantyDurationLabel } from "@/lib/documents/warranty/custom-warranty";
import type { MotorSaleWarrantyOverride } from "@/lib/documents/warranty/custom-warranty";
import { formatGroupedNumber } from "@/lib/money/format-number";
import { userCopy } from "@/lib/user-copy";

export type MotorSellPayload = SellFinancialPayload & {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  warrantyOverride?: MotorSaleWarrantyOverride;
};

export type SellMotorDialogLabels = {
  titleSell: string;
  titleReturn: string;
  description: (serial: string, withWarranty: boolean) => string;
  selectMotor: string;
  buyer: string;
  fullName: string;
  phone: string;
  namePlaceholder: string;
  buyerHint: string;
  frequentlyBought: string;
  skuLabel: string;
  commentSellPrefix: string;
  commentReturnPrefix: string;
  amount: string;
  account: string;
  payment: string;
  cashbox: string;
  kaspi: string;
  cash: string;
  transfer: string;
  mixed: string;
  warrantyTitle: string;
  warrantyDays: string;
  warrantyKm: string;
  warrantyLabel: string;
  warrantyText: string;
  warrantyTextPlaceholder: string;
  comment: string;
  cancel: string;
  sell: string;
  return: string;
  saving: string;
  errors: {
    amount: string;
    buyerName: string;
    buyerPhone: string;
    warrantyDays: string;
    warrantyKm: string;
    warrantyText: string;
    generic: string;
  };
};

function getDefaultSellMotorLabels(): SellMotorDialogLabels {
  const sell = userCopy.motors.sell;
  return {
    titleSell: sell.titleSell,
    titleReturn: sell.titleReturn,
    description: (serial, withWarranty) => sell.description(serial, withWarranty),
    selectMotor: sell.selectMotor,
    buyer: sell.buyer,
    fullName: sell.fullName,
    phone: sell.phone,
    namePlaceholder: sell.namePlaceholder,
    buyerHint: sell.buyerHint,
    frequentlyBought: sell.frequentlyBought,
    skuLabel: sell.skuLabel,
    commentSellPrefix: sell.commentSellPrefix,
    commentReturnPrefix: sell.commentReturnPrefix,
    amount: sell.amount,
    account: sell.account,
    payment: sell.payment,
    cashbox: sell.cashbox,
    kaspi: sell.kaspi,
    cash: sell.cash,
    transfer: sell.transfer,
    mixed: sell.mixed,
    warrantyTitle: sell.warrantyTitle,
    warrantyDays: sell.warrantyDays,
    warrantyKm: sell.warrantyKm,
    warrantyLabel: sell.warrantyLabel,
    warrantyText: sell.warrantyText,
    warrantyTextPlaceholder: sell.warrantyTextPlaceholder,
    comment: sell.comment,
    cancel: sell.cancel,
    sell: sell.sell,
    return: sell.return,
    saving: sell.saving,
    errors: { ...sell.errors },
  };
}

const clientRepository = createClientRepository();

type SellMotorDialogProps = {
  companyId: string | null | undefined;
  motor: MotorEntity | null;
  mode: "sell" | "unsell";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: MotorSellPayload) => Promise<void>;
  /** Prefill for demos / guided flows — still the real sell form. */
  initialValues?: {
    amount?: number;
    clientName?: string;
    clientPhone?: string;
    account?: OperationAccount;
    paymentMethod?: PaymentMethod;
    comment?: string;
  };
  /** Optional localized UI copy (marketing demos). Defaults to active userCopy locale. */
  labels?: SellMotorDialogLabels;
};

function SellMotorDialogForm({
  companyId,
  motor,
  mode,
  onCancel,
  onConfirm,
  initialValues,
  labels: labelsProp,
}: {
  companyId: string | null | undefined;
  motor: MotorEntity;
  mode: "sell" | "unsell";
  onCancel: () => void;
  onConfirm: (payload: MotorSellPayload) => Promise<void>;
  initialValues?: SellMotorDialogProps["initialValues"];
  labels?: SellMotorDialogLabels;
}) {
  const labels = labelsProp ?? getDefaultSellMotorLabels();
  const { profile } = useCompanyBranding(companyId);
  const { clients } = useClientsRealtime(clientRepository, companyId ?? "", mode === "sell");
  const usesCustomWarranty = profile.warrantyTemplateId === "custom" && mode === "sell";
  const { toast } = useToast();
  const {
    suggestions: fbtSuggestions,
    accept: acceptFbtSuggestion,
    dismiss: dismissFbtSuggestion,
  } = useKnowledgeSuggestions({
    enabled: mode === "sell",
    companyId,
    engineCode: motor.engineCode,
    brandName: motor.brandName,
    limit: 6,
  });

  function handleAcceptFbtSuggestion(suggestion: KnowledgeSuggestion) {
    void acceptFbtSuggestion(suggestion);
    const sku = Array.isArray(suggestion.payload.keys)
      ? (suggestion.payload.keys as unknown[]).find(
          (key) => typeof key === "string" && key.trim().length > 0,
        )
      : undefined;
    toast({
      title: `${labels.frequentlyBought}: ${suggestion.title}`,
      description: sku ? `${labels.skuLabel} ${sku}` : suggestion.explanation,
    });
  }

  const defaultDays = profile.customWarrantyDays ? String(profile.customWarrantyDays) : "180";
  const defaultKm = profile.customWarrantyKm ? String(profile.customWarrantyKm) : "10000";

  const [amount, setAmount] = useState(
    formatGroupedNumber(initialValues?.amount && initialValues.amount > 0 ? initialValues.amount : 0),
  );
  const [account, setAccount] = useState<OperationAccount>(initialValues?.account ?? "cashbox");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialValues?.paymentMethod ?? "cash",
  );
  const [mixedCashPortion, setMixedCashPortion] = useState(0);
  const [comment, setComment] = useState(
    initialValues?.comment ??
      (mode === "sell"
        ? `${labels.commentSellPrefix} ${motor.serialCode}`
        : `${labels.commentReturnPrefix} ${motor.serialCode}`),
  );
  const [warrantyDays, setWarrantyDays] = useState(defaultDays);
  const [warrantyKm, setWarrantyKm] = useState(defaultKm);
  const [warrantyLabel, setWarrantyLabel] = useState(profile.warrantyLabel ?? "");
  const [warrantyText, setWarrantyText] = useState(profile.warrantyText ?? "");
  const [clientId, setClientId] = useState<string | undefined>();
  const [clientName, setClientName] = useState(initialValues?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(initialValues?.clientPhone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientNameOptions = useMemo(
    () => clients.map((client) => ({ value: client.fullName, label: client.phone })),
    [clients],
  );
  const clientPhoneOptions = useMemo(
    () => clients.map((client) => ({ value: client.phone, label: client.fullName })),
    [clients],
  );

  function selectClient(id: string) {
    const client = clients.find((entry) => entry.id === id);
    if (!client) return;
    setClientId(client.id);
    setClientName(client.fullName);
    setClientPhone(client.phone);
  }

  useEffect(() => {
    setWarrantyDays(defaultDays);
    setWarrantyKm(defaultKm);
    setWarrantyLabel(profile.warrantyLabel ?? "");
    setWarrantyText(profile.warrantyText ?? "");
    setClientId(undefined);
    setClientName(initialValues?.clientName ?? "");
    setClientPhone(initialValues?.clientPhone ?? "");
    setAmount(
      formatGroupedNumber(initialValues?.amount && initialValues.amount > 0 ? initialValues.amount : 0),
    );
    setAccount(initialValues?.account ?? "cashbox");
    setPaymentMethod(initialValues?.paymentMethod ?? "cash");
    setMixedCashPortion(0);
    setComment(
      initialValues?.comment ??
        (mode === "sell"
          ? `${labels.commentSellPrefix} ${motor.serialCode}`
          : `${labels.commentReturnPrefix} ${motor.serialCode}`),
    );
  }, [
    defaultDays,
    defaultKm,
    profile.warrantyLabel,
    profile.warrantyText,
    motor.id,
    motor.serialCode,
    mode,
    labels.commentSellPrefix,
    labels.commentReturnPrefix,
    initialValues?.amount,
    initialValues?.clientName,
    initialValues?.clientPhone,
    initialValues?.account,
    initialValues?.paymentMethod,
    initialValues?.comment,
  ]);

  const parsedAmount = useMemo(() => parseGroupedNumber(amount), [amount]);
  const parsedDays = Number(warrantyDays);
  const parsedKm = Number(warrantyKm);
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
      setError(labels.errors.amount);
      return;
    }
    if (isMixed && !isValidMixedSplit(parsedAmount, mixedCashPortion)) {
      setError(userCopy.accounting.newOperation.invalidMixedSplit);
      return;
    }

    if (mode === "sell") {
      const name = clientName.trim();
      const phone = clientPhone.trim();
      if (name.length < 2) {
        setError(labels.errors.buyerName);
        return;
      }
      if (phone.length < 3) {
        setError(labels.errors.buyerPhone);
        return;
      }
    }

    if (usesCustomWarranty) {
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        setError(labels.errors.warrantyDays);
        return;
      }
      if (!Number.isFinite(parsedKm) || parsedKm <= 0) {
        setError(labels.errors.warrantyKm);
        return;
      }
      if (!warrantyText.trim()) {
        setError(labels.errors.warrantyText);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const label =
        warrantyLabel.trim() ||
        (usesCustomWarranty
          ? formatWarrantyDurationLabel(parsedDays, parsedKm)
          : undefined);

      const payment = buildMixedPaymentFields(
        paymentMethod,
        account,
        parsedAmount,
        mixedCashPortion,
      );

      await onConfirm({
        amount: parsedAmount,
        account: payment.account,
        paymentMethod: payment.paymentMethod,
        cashReceived: payment.cashReceived,
        comment: comment.trim(),
        ...(mode === "sell"
          ? {
              clientId,
              clientName: clientName.trim(),
              clientPhone: clientPhone.trim(),
            }
          : {}),
        warrantyOverride: usesCustomWarranty
          ? {
              warrantyLabel: label,
              warrantyText: warrantyText.trim(),
              customWarrantyDays: parsedDays,
              customWarrantyKm: parsedKm,
            }
          : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : labels.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader className="shrink-0">
        <DialogTitle>{mode === "sell" ? labels.titleSell : labels.titleReturn}</DialogTitle>
        <DialogDescription>
          {labels.description(motor.serialCode, usesCustomWarranty)}
        </DialogDescription>
      </DialogHeader>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain pr-1">
        {mode === "sell" ? (
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-3">
            <p className="text-sm font-medium">{labels.buyer}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="motor-sale-client-name">{labels.fullName}</Label>
                <DatalistInput
                  id="motor-sale-client-name"
                  value={clientName}
                  onValueChange={(value) => {
                    setClientId(undefined);
                    setClientName(value);
                  }}
                  options={clientNameOptions}
                  onOptionCommit={(value) => {
                    const client = clients.find((entry) => entry.fullName === value);
                    if (client) selectClient(client.id);
                  }}
                  placeholder={labels.namePlaceholder}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="motor-sale-client-phone">{labels.phone}</Label>
                <DatalistInput
                  id="motor-sale-client-phone"
                  value={clientPhone}
                  onValueChange={(value) => {
                    setClientId(undefined);
                    setClientPhone(value);
                  }}
                  options={clientPhoneOptions}
                  onOptionCommit={(value) => {
                    const client = clients.find((entry) => entry.phone === value);
                    if (client) selectClient(client.id);
                  }}
                  placeholder="+7 777 000 00 00"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {labels.buyerHint}
            </p>
          </div>
        ) : null}

        {mode === "sell" && fbtSuggestions.length > 0 ? (
          <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {labels.frequentlyBought}
            </p>
            <KnowledgeSuggestionChips
              suggestions={fbtSuggestions}
              onAccept={handleAcceptFbtSuggestion}
              onDismiss={dismissFbtSuggestion}
            />
          </div>
        ) : null}

        <div className="space-y-1">
          <Label>{labels.amount}</Label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {!isMixed ? (
            <div className="space-y-1">
              <Label>{labels.account}</Label>
              <Select value={account} onValueChange={(value) => setAccount(value as OperationAccount)}>
                <SelectTrigger>
                  <SelectValue>
                    {account === "kaspi" ? labels.kaspi : labels.cashbox}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashbox">{labels.cashbox}</SelectItem>
                  <SelectItem value="kaspi">{labels.kaspi}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className={isMixed ? "space-y-1 sm:col-span-2" : "space-y-1"}>
            <Label>{labels.payment}</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => selectPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue>
                  {paymentMethod === "transfer"
                    ? labels.transfer
                    : paymentMethod === "mixed"
                      ? labels.mixed
                      : labels.cash}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{labels.cash}</SelectItem>
                <SelectItem value="transfer">{labels.transfer}</SelectItem>
                <SelectItem value="mixed">{labels.mixed}</SelectItem>
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

        {usesCustomWarranty ? (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-medium">{labels.warrantyTitle}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sale-warranty-days">{labels.warrantyDays}</Label>
                <Input
                  id="sale-warranty-days"
                  type="number"
                  min={1}
                  value={warrantyDays}
                  onChange={(event) => setWarrantyDays(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sale-warranty-km">{labels.warrantyKm}</Label>
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
              <Label htmlFor="sale-warranty-label">{labels.warrantyLabel}</Label>
              <Input
                id="sale-warranty-label"
                value={warrantyLabel}
                onChange={(event) => setWarrantyLabel(event.target.value)}
                placeholder={formatWarrantyDurationLabel(parsedDays || 180, parsedKm || 10_000)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sale-warranty-text">{labels.warrantyText}</Label>
              <Textarea
                id="sale-warranty-text"
                value={warrantyText}
                onChange={(event) => setWarrantyText(event.target.value)}
                rows={5}
                placeholder={labels.warrantyTextPlaceholder}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1">
          <Label>{labels.comment}</Label>
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="mt-4 shrink-0 border-t border-border/70 px-0 pb-0 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {labels.cancel}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? labels.saving : mode === "sell" ? labels.sell : labels.return}
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
  initialValues,
  labels,
}: SellMotorDialogProps) {
  const resolvedLabels = labels ?? getDefaultSellMotorLabels();
  async function handleConfirm(payload: MotorSellPayload) {
    await onConfirm(payload);
    onOpenChange(false);
  }

  if (!motor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md duration-300">
          <DialogHeader>
            <DialogTitle>{resolvedLabels.titleSell}</DialogTitle>
            <DialogDescription>{resolvedLabels.selectMotor}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,900px)] max-w-lg flex-col overflow-hidden duration-300">
        <SellMotorDialogForm
          key={`${motor.id}-${mode}-${initialValues?.amount ?? 0}`}
          companyId={companyId}
          motor={motor}
          mode={mode}
          initialValues={initialValues}
          labels={resolvedLabels}
          onCancel={() => onOpenChange(false)}
          onConfirm={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
