export const MARKETPLACE_CHANNELS = ["avito", "drom"] as const;
export type MarketplaceChannel = (typeof MARKETPLACE_CHANNELS)[number];

export const MARKETPLACE_LISTING_STATUSES = ["listed", "reserved", "sold", "delisted"] as const;
export type MarketplaceListingStatus = (typeof MARKETPLACE_LISTING_STATUSES)[number];

export type MarketplaceListing = {
  id: string;
  companyId: string;
  usedPartId: string;
  donorId?: string;
  channel: MarketplaceChannel;
  status: MarketplaceListingStatus;
  title: string;
  price: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MarketplaceSettings = {
  companyId: string;
  feedToken: string;
  avitoEnabled: boolean;
  dromEnabled: boolean;
  updatedAt?: Date;
};

export function listingStatusForPart(
  partStatus: "available" | "reserved" | "sold" | "scrapped",
): MarketplaceListingStatus {
  if (partStatus === "sold") return "sold";
  if (partStatus === "reserved") return "reserved";
  if (partStatus === "scrapped") return "delisted";
  return "listed";
}
