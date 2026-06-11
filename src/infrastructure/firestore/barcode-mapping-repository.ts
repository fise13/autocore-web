import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { omitUndefinedFields } from "@/lib/firestore/omit-undefined-fields";
import { normalizeBarcode } from "@/lib/warehouse/warehouse-sync-ids";

const COLLECTION = "barcodeMappings";

export type BarcodeMapping = {
  id: string;
  companyId: string;
  barcode: string;
  itemId: string;
  warehouseId?: string;
  format?: string;
  isPrimary: boolean;
};

function mapBarcode(id: string, data: Record<string, unknown>): BarcodeMapping {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    barcode: String(data.barcode ?? ""),
    itemId: String(data.itemId ?? ""),
    warehouseId: typeof data.warehouseId === "string" ? data.warehouseId : undefined,
    format: typeof data.format === "string" ? data.format : undefined,
    isPrimary: Boolean(data.isPrimary),
  };
}

export type BarcodeMappingRepository = ReturnType<typeof createBarcodeMappingRepository>;

export function createBarcodeMappingRepository() {
  const db = getFirestoreDb();
  const ref = collection(db, COLLECTION);

  return {
    async findByBarcode(companyId: string, barcode: string): Promise<BarcodeMapping | null> {
      const normalized = normalizeBarcode(barcode);
      const snapshot = await getDocs(
        query(
          ref,
          where("companyId", "==", normalizeCompanyId(companyId)),
          where("barcode", "==", normalized),
          limit(1),
        ),
      );
      const first = snapshot.docs[0];
      if (!first) return null;
      return mapBarcode(first.id, first.data() as Record<string, unknown>);
    },

    async findByBarcodes(companyId: string, barcodes: string[]): Promise<BarcodeMapping[]> {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const unique = [...new Set(barcodes.map((code) => normalizeBarcode(code)).filter(Boolean))];
      if (unique.length === 0) return [];

      const results: BarcodeMapping[] = [];
      for (let offset = 0; offset < unique.length; offset += 30) {
        const chunk = unique.slice(offset, offset + 30);
        const snapshot = await getDocs(
          query(
            ref,
            where("companyId", "==", normalizedCompanyId),
            where("barcode", "in", chunk),
          ),
        );
        for (const item of snapshot.docs) {
          results.push(mapBarcode(item.id, item.data() as Record<string, unknown>));
        }
      }
      return results;
    },

    async upsert(input: {
      companyId: string;
      barcode: string;
      itemId: string;
      warehouseId?: string;
      format?: string;
      isPrimary?: boolean;
    }): Promise<string> {
      const existing = await this.findByBarcode(input.companyId, input.barcode);
      const payload = omitUndefinedFields({
        companyId: normalizeCompanyId(input.companyId),
        barcode: normalizeBarcode(input.barcode),
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        format: input.format,
        isPrimary: input.isPrimary ?? false,
        updatedAt: serverTimestamp(),
      });
      if (existing) {
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, COLLECTION, existing.id), payload);
        return existing.id;
      }
      const created = await addDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return created.id;
    },
  };
}
