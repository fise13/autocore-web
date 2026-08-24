import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import type { MarketplaceSettings } from "@/domain/marketplace-listing";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";

function settingsRef(companyId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), "settings", "marketplace");
}

function mapSettings(companyId: string, data: Record<string, unknown> | undefined): MarketplaceSettings {
  return {
    companyId,
    feedToken: typeof data?.feedToken === "string" ? data.feedToken : "",
    avitoEnabled: data?.avitoEnabled !== false,
    dromEnabled: data?.dromEnabled !== false,
    updatedAt: toDateFromFirestore(data?.updatedAt),
  };
}

export function createMarketplaceSettingsRepository() {
  return {
    async get(companyId: string): Promise<MarketplaceSettings> {
      const snap = await getDoc(settingsRef(companyId));
      return mapSettings(companyId, snap.exists() ? (snap.data() as Record<string, unknown>) : undefined);
    },

    async save(companyId: string, patch: Partial<MarketplaceSettings>): Promise<MarketplaceSettings> {
      const ref = settingsRef(companyId);
      await setDoc(
        ref,
        {
          companyId: normalizeCompanyId(companyId),
          feedToken: patch.feedToken,
          avitoEnabled: patch.avitoEnabled,
          dromEnabled: patch.dromEnabled,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return this.get(companyId);
    },
  };
}
