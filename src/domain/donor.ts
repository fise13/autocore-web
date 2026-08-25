export const DONOR_STATUSES = ["intake", "in_progress", "dismantled", "scrapped"] as const;

export type DonorStatus = (typeof DONOR_STATUSES)[number];

export type DonorVehicle = {
  id: string;
  companyId: string;
  vin: string;
  make: string;
  model: string;
  year?: number;
  body?: string;
  purchasePrice: number;
  currency: string;
  source?: string;
  status: DonorStatus;
  yardLocation?: string;
  photoUrls: string[];
  notes?: string;
  purchasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string;
};

export type CreateDonorInput = {
  companyId: string;
  vin?: string;
  make: string;
  model: string;
  year?: number;
  body?: string;
  purchasePrice?: number;
  currency?: string;
  source?: string;
  status?: DonorStatus;
  yardLocation?: string;
  photoUrls?: string[];
  notes?: string;
  purchasedAt?: Date;
  createdByUserId: string;
  id?: string;
};

/**
 * Fields an edit may change. Identity is excluded on purpose: reassigning a
 * donor to another company or another author is never an edit.
 *
 * The two optional values a user can take back once entered accept `null`,
 * which clears them. `undefined` means "leave this field alone", so without
 * the distinction a year or a purchase date could be set but never unset.
 */
export type UpdateDonorInput = Partial<
  Omit<CreateDonorInput, "companyId" | "createdByUserId" | "id" | "year" | "purchasedAt">
> & {
  year?: number | null;
  purchasedAt?: Date | null;
};

export function donorLabel(donor: Pick<DonorVehicle, "make" | "model" | "year" | "vin">): string {
  const year = donor.year ? String(donor.year) : "";
  const name = [year, donor.make, donor.model].filter(Boolean).join(" ").trim();
  if (name && donor.vin) return `${name} · ${donor.vin}`;
  return name || donor.vin || donor.make;
}

export function donorApplicability(donor: Pick<DonorVehicle, "make" | "model" | "year" | "body">): string {
  return [donor.make, donor.model, donor.year, donor.body].filter(Boolean).join(" ").trim();
}
