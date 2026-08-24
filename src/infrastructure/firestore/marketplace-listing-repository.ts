import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  MarketplaceChannel,
  MarketplaceListing,
  MarketplaceListingStatus,
  listingStatusForPart,
} from "@/domain/marketplace-listing";
import type { UsedPart } from "@/domain/used-part";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "marketplaceListings";

function listingsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function listingRef(companyId: string, listingId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, listingId);
}

function listingIdFor(partId: string, channel: MarketplaceChannel): string {
  return `${partId}_${channel}`;
}

function mapListing(id: string, data: Record<string, unknown>): MarketplaceListing {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    usedPartId: String(data.usedPartId ?? ""),
    donorId: typeof data.donorId === "string" ? data.donorId : undefined,
    channel: (data.channel as MarketplaceChannel) ?? "avito",
    status: (data.status as MarketplaceListingStatus) ?? "listed",
    title: String(data.title ?? ""),
    price: Number(data.price ?? 0),
    currency: String(data.currency ?? "KZT"),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

export type MarketplaceListingRepository = ReturnType<typeof createMarketplaceListingRepository>;

export function createMarketplaceListingRepository() {
  return {
    subscribe(companyId: string, onData: (listings: MarketplaceListing[]) => void, onError?: (error: Error) => void) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const q = query(listingsRef(companyId), orderBy("updatedAt", "desc"), limit(500));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapListing(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async listByCompany(companyId: string): Promise<MarketplaceListing[]> {
      const q = query(listingsRef(companyId), orderBy("updatedAt", "desc"), limit(500));
      const { getDocs } = await import("firebase/firestore");
      const snap = await getDocs(q);
      return snap.docs.map((item) => mapListing(item.id, item.data() as Record<string, unknown>));
    },

    async syncForPart(companyId: string, part: UsedPart): Promise<void> {
      const channels: MarketplaceChannel[] = [];
      if (part.listedOnAvito) channels.push("avito");
      if (part.listedOnDrom) channels.push("drom");
      const status = listingStatusForPart(part.status);

      for (const channel of channels) {
        const id = listingIdFor(part.id, channel);
        const ref = listingRef(companyId, id);
        const existing = await getDoc(ref);
        const payload = {
          companyId: normalizeCompanyId(companyId),
          usedPartId: part.id,
          donorId: part.donorId || null,
          channel,
          status,
          title: part.name,
          price: part.sellPrice,
          currency: part.currency,
          updatedAt: serverTimestamp(),
        };
        if (existing.exists()) {
          await updateDoc(ref, payload);
        } else {
          await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
        }
      }

      const toDelist: MarketplaceChannel[] = [];
      if (!part.listedOnAvito) toDelist.push("avito");
      if (!part.listedOnDrom) toDelist.push("drom");
      for (const channel of toDelist) {
        const ref = listingRef(companyId, listingIdFor(part.id, channel));
        const existing = await getDoc(ref);
        if (!existing.exists()) continue;
        await updateDoc(ref, { status: "delisted", updatedAt: serverTimestamp() });
      }
    },

    async markSold(companyId: string, partId: string): Promise<void> {
      const q = query(listingsRef(companyId), where("usedPartId", "==", partId), limit(10));
      const { getDocs } = await import("firebase/firestore");
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((item) =>
          updateDoc(item.ref, { status: "sold", updatedAt: serverTimestamp() }),
        ),
      );
    },
  };
}
