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

export function donorLabel(donor: Pick<DonorVehicle, "make" | "model" | "year" | "vin">): string {
  const year = donor.year ? String(donor.year) : "";
  const name = [year, donor.make, donor.model].filter(Boolean).join(" ").trim();
  if (name && donor.vin) return `${name} · ${donor.vin}`;
  return name || donor.vin || donor.make;
}

export function donorApplicability(donor: Pick<DonorVehicle, "make" | "model" | "year" | "body">): string {
  return [donor.make, donor.model, donor.year, donor.body].filter(Boolean).join(" ").trim();
}
