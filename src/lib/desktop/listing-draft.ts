export type ListingPlatform = "kolesa" | "olx";

export type ListingDraft = {
  motorId: string;
  platform: ListingPlatform;
  title: string;
  description: string;
  price: number;
  currency: "KZT";
  photoUrls: string[];
  categoryHint?: string;
};

export type DesktopMotorSummary = {
  id: string;
  label: string;
  status?: string;
  serialCode?: string;
};
