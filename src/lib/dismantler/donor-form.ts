import type { DonorVehicle, UpdateDonorInput } from "@/domain/donor";

export type DonorFormState = {
  vin: string;
  make: string;
  model: string;
  year: string;
  body: string;
  purchasePrice: string;
  source: string;
  yardLocation: string;
  purchasedAt: string;
  notes: string;
};

export const EMPTY_DONOR_FORM: DonorFormState = {
  vin: "",
  make: "",
  model: "",
  year: "",
  body: "",
  purchasePrice: "",
  source: "",
  yardLocation: "",
  purchasedAt: "",
  notes: "",
};

/** `<input type="date">` speaks YYYY-MM-DD and nothing else. */
export function toDateInputValue(value: Date | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  return value.toISOString().slice(0, 10);
}

export function donorFormFromDonor(donor: DonorVehicle): DonorFormState {
  return {
    vin: donor.vin,
    make: donor.make,
    model: donor.model,
    year: donor.year ? String(donor.year) : "",
    body: donor.body ?? "",
    purchasePrice: donor.purchasePrice ? String(donor.purchasePrice) : "",
    source: donor.source ?? "",
    yardLocation: donor.yardLocation ?? "",
    purchasedAt: toDateInputValue(donor.purchasedAt),
    notes: donor.notes ?? "",
  };
}

/**
 * Blank, whitespace, and unparseable input all mean "not set" — never 0 or NaN.
 * `null` rather than `undefined` so clearing the field clears it on the record
 * instead of silently leaving the old value in place.
 */
function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalDate(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function donorFormValues(form: DonorFormState): UpdateDonorInput {
  return {
    vin: form.vin,
    make: form.make,
    model: form.model,
    year: optionalNumber(form.year),
    body: form.body,
    purchasePrice: optionalNumber(form.purchasePrice) ?? 0,
    source: form.source,
    yardLocation: form.yardLocation,
    purchasedAt: optionalDate(form.purchasedAt),
    notes: form.notes,
  };
}

export function isDonorFormValid(form: DonorFormState): boolean {
  return form.make.trim().length > 0;
}
