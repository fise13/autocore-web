"use client";

import { useState } from "react";

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
import type { DonorVehicle, UpdateDonorInput } from "@/domain/donor";
import {
  donorFormFromDonor,
  donorFormValues,
  EMPTY_DONOR_FORM,
  isDonorFormValid,
  type DonorFormState,
} from "@/lib/dismantler/donor-form";
import { userCopy } from "@/lib/user-copy";

/**
 * Create and edit share one form. `donor` decides which: null opens a blank
 * create form, a donor opens it pre-filled for editing.
 */
export function DonorFormDialog({
  open,
  donor,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  donor: DonorVehicle | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdateDonorInput) => void;
}) {
  const copy = userCopy.donors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{donor ? copy.editTitle : copy.create}</DialogTitle>
          <DialogDescription>{copy.subtitle}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the draft starts clean on every open
            and a cancelled edit never leaks into the next one. */}
        {open ? (
          <DonorFormBody
            donor={donor}
            busy={busy}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DonorFormBody({
  donor,
  busy,
  onCancel,
  onSubmit,
}: {
  donor: DonorVehicle | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: UpdateDonorInput) => void;
}) {
  const copy = userCopy.donors;
  const [form, setForm] = useState<DonorFormState>(() =>
    donor ? donorFormFromDonor(donor) : EMPTY_DONOR_FORM,
  );

  const makeMissing = !isDonorFormValid(form);

  function field(key: keyof DonorFormState) {
    return (value: string) => setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <div className="grid gap-3">
        <Field label={copy.vin} value={form.vin} onChange={field("vin")} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={copy.make}
            value={form.make}
            onChange={field("make")}
            hint={makeMissing ? copy.makeRequired : undefined}
          />
          <Field label={copy.model} value={form.model} onChange={field("model")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={copy.year} value={form.year} onChange={field("year")} inputMode="numeric" />
          <Field label={copy.body} value={form.body} onChange={field("body")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={copy.purchasePrice}
            value={form.purchasePrice}
            onChange={field("purchasePrice")}
            inputMode="decimal"
          />
          <Field
            label={copy.purchasedAt}
            value={form.purchasedAt}
            onChange={field("purchasedAt")}
            type="date"
          />
        </div>
        <Field label={copy.source} value={form.source} onChange={field("source")} />
        <Field label={copy.yardLocation} value={form.yardLocation} onChange={field("yardLocation")} />
        <Field label={copy.notes} value={form.notes} onChange={field("notes")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button
          type="button"
          disabled={busy || makeMissing}
          onClick={() => onSubmit(donorFormValues(form))}
        >
          {busy ? copy.saving : copy.save}
        </Button>
      </DialogFooter>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  type,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: string;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        type={type}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
