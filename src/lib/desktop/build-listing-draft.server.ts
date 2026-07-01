import "server-only";

import { ListingDraft, ListingPlatform } from "@/lib/desktop/listing-draft";
import { fetchMotorDocumentById } from "@/lib/desktop/fetch-motor.server";
import { formatMotorDisplayName } from "@/lib/motors/format-motor-display-name";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { normalizeCompanyId } from "@/lib/company-id";

function readPhotoUrls(raw: Record<string, unknown>): string[] {
  if (Array.isArray(raw.photoUrls)) {
    return raw.photoUrls.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof raw.photoUrl === "string" && raw.photoUrl.trim()) {
    return [raw.photoUrl.trim()];
  }
  return [];
}

async function readSalePrice(companyId: string, motorId: string): Promise<number> {
  const db = getAdminFirestore();
  const snap = await db
    .collection("companies")
    .doc(normalizeCompanyId(companyId))
    .collection("warranties")
    .where("motorId", "==", motorId)
    .limit(1)
    .get();

  if (snap.empty) return 0;
  const data = snap.docs[0].data();
  const saleAmount = data.saleAmount;
  return typeof saleAmount === "number" && saleAmount > 0 ? saleAmount : 0;
}

export async function buildListingDraft(params: {
  companyId: string;
  motorId: string;
  platform: ListingPlatform;
}): Promise<ListingDraft> {
  const document = await fetchMotorDocumentById(params.companyId, params.motorId);
  if (!document) {
    throw new Error("Мотор не найден");
  }

  const { motor, raw } = document;
  const title = formatMotorDisplayName(motor) || motor.serialCode || "Двигатель";
  const description = motor.notes?.trim() || `Двигатель ${title}`;
  const price = await readSalePrice(params.companyId, motor.id);
  const photoUrls = readPhotoUrls(raw);

  return {
    motorId: motor.id,
    platform: params.platform,
    title,
    description,
    price,
    currency: "KZT",
    photoUrls,
    categoryHint: params.platform === "kolesa" ? "auto.car" : undefined,
  };
}
