import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { getFirebaseDb } from '@/services/firebase';

const COLLECTION = 'barcodeMappings';

export type BarcodeMapping = {
  id: string;
  companyId: string;
  barcode: string;
  itemId: string;
  warehouseId?: string;
  format?: string;
  isPrimary: boolean;
};

function normalizeBarcode(barcode: string): string {
  return barcode.trim().toUpperCase();
}

function mapBarcode(id: string, data: Record<string, unknown>): BarcodeMapping {
  return {
    id,
    companyId: String(data.companyId ?? ''),
    barcode: String(data.barcode ?? ''),
    itemId: String(data.itemId ?? ''),
    warehouseId: typeof data.warehouseId === 'string' ? data.warehouseId : undefined,
    format: typeof data.format === 'string' ? data.format : undefined,
    isPrimary: Boolean(data.isPrimary),
  };
}

export function createBarcodeMappingRepository() {
  const db = getFirebaseDb();
  const ref = collection(db, COLLECTION);

  return {
    async findByBarcode(companyId: string, barcode: string): Promise<BarcodeMapping | null> {
      const normalized = normalizeBarcode(barcode);
      const snapshot = await getDocs(
        query(
          ref,
          where('companyId', '==', normalizeCompanyId(companyId)),
          where('barcode', '==', normalized),
          limit(1),
        ),
      );
      const first = snapshot.docs[0];
      if (!first) return null;
      return mapBarcode(first.id, first.data() as Record<string, unknown>);
    },
  };
}

export const barcodeMappingRepository = createBarcodeMappingRepository();
