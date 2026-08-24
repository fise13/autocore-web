export const USED_PART_STATUSES = ["available", "reserved", "sold", "scrapped"] as const;

export type UsedPartStatus = (typeof USED_PART_STATUSES)[number];

export type UsedPart = {
  id: string;
  companyId: string;
  donorId: string;
  name: string;
  oemNumber?: string;
  conditionPercent?: number;
  quality?: string;
  sellPrice: number;
  currency: string;
  locationCode?: string;
  photoUrls: string[];
  applicability: string;
  status: UsedPartStatus;
  listedOnAvito: boolean;
  listedOnDrom: boolean;
  soldAt?: Date;
  soldAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string;
};

export type CreateUsedPartInput = {
  companyId: string;
  donorId: string;
  name: string;
  oemNumber?: string;
  conditionPercent?: number;
  quality?: string;
  sellPrice?: number;
  currency?: string;
  locationCode?: string;
  photoUrls?: string[];
  applicability?: string;
  status?: UsedPartStatus;
  listedOnAvito?: boolean;
  listedOnDrom?: boolean;
  notes?: string;
  createdByUserId: string;
  id?: string;
};

export function isUsedPartAvailableForSale(part: Pick<UsedPart, "status">): boolean {
  return part.status === "available";
}
