import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";
import type { DonorVehicle } from "@/domain/donor";
import type { MarketplaceListing, MarketplaceSettings } from "@/domain/marketplace-listing";
import type { UsedPart } from "@/domain/used-part";

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export async function loadMarketplaceFeedAdmin(companyId: string): Promise<{
  settings: MarketplaceSettings;
  listings: MarketplaceListing[];
  parts: UsedPart[];
  donors: DonorVehicle[];
}> {
  const db = getAdminFirestore();
  const normalized = normalizeCompanyId(companyId);
  const companyRef = db.collection("companies").doc(normalized);
  const [settingsSnap, listingsSnap, partsSnap, donorsSnap] = await Promise.all([
    companyRef.collection("settings").doc("marketplace").get(),
    companyRef.collection("marketplaceListings").limit(500).get(),
    companyRef.collection("usedParts").limit(500).get(),
    companyRef.collection("donors").limit(300).get(),
  ]);

  const settingsData = settingsSnap.data() as Record<string, unknown> | undefined;
  const settings: MarketplaceSettings = {
    companyId: normalized,
    feedToken: String(settingsData?.feedToken ?? ""),
    avitoEnabled: settingsData?.avitoEnabled !== false,
    dromEnabled: settingsData?.dromEnabled !== false,
  };

  const listings: MarketplaceListing[] = listingsSnap.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    return {
      id: item.id,
      companyId: String(data.companyId ?? normalized),
      usedPartId: String(data.usedPartId ?? ""),
      donorId: typeof data.donorId === "string" ? data.donorId : undefined,
      channel: data.channel === "drom" ? "drom" : "avito",
      status:
        data.status === "sold" || data.status === "reserved" || data.status === "delisted"
          ? data.status
          : "listed",
      title: String(data.title ?? ""),
      price: Number(data.price ?? 0),
      currency: String(data.currency ?? "KZT"),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  });

  const parts: UsedPart[] = partsSnap.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    return {
      id: item.id,
      companyId: String(data.companyId ?? normalized),
      donorId: String(data.donorId ?? ""),
      name: String(data.name ?? ""),
      oemNumber: typeof data.oemNumber === "string" ? data.oemNumber : undefined,
      conditionPercent: data.conditionPercent == null ? undefined : Number(data.conditionPercent),
      sellPrice: Number(data.sellPrice ?? 0),
      currency: String(data.currency ?? "KZT"),
      locationCode: typeof data.locationCode === "string" ? data.locationCode : undefined,
      photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls.map(String) : [],
      applicability: String(data.applicability ?? ""),
      status:
        data.status === "sold" || data.status === "reserved" || data.status === "scrapped"
          ? data.status
          : "available",
      listedOnAvito: data.listedOnAvito === true,
      listedOnDrom: data.listedOnDrom === true,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      createdByUserId: String(data.createdByUserId ?? ""),
    };
  });

  const donors: DonorVehicle[] = donorsSnap.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    return {
      id: item.id,
      companyId: String(data.companyId ?? normalized),
      vin: String(data.vin ?? ""),
      make: String(data.make ?? ""),
      model: String(data.model ?? ""),
      year: data.year == null ? undefined : Number(data.year),
      body: typeof data.body === "string" ? data.body : undefined,
      purchasePrice: Number(data.purchasePrice ?? 0),
      currency: String(data.currency ?? "KZT"),
      status:
        data.status === "in_progress" || data.status === "dismantled" || data.status === "scrapped"
          ? data.status
          : "intake",
      photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls.map(String) : [],
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      createdByUserId: String(data.createdByUserId ?? ""),
    };
  });

  return { settings, listings, parts, donors };
}
