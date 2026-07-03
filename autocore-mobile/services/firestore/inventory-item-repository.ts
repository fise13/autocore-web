import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';
import type { InventoryItem, InventoryItemStatus, InventoryItemType } from '@/types/inventory';

const COLLECTION = 'inventoryItems';

function mapItem(id: string, data: Record<string, unknown>): InventoryItem {
  const totalOnHand = Number(data.totalOnHand ?? data.quantity ?? 0);
  const totalReserved = Number(data.totalReserved ?? 0);
  return {
    id,
    companyId: String(data.companyId ?? ''),
    type: (data.type as InventoryItemType) ?? 'generic',
    sku: String(data.sku ?? ''),
    name: String(data.name ?? ''),
    description: typeof data.description === 'string' ? data.description : undefined,
    barcodes: Array.isArray(data.barcodes) ? data.barcodes.map(String) : [],
    brandName: typeof data.brandName === 'string' ? data.brandName : undefined,
    warehouseLocation:
      typeof data.warehouseLocation === 'string' ? data.warehouseLocation : undefined,
    unit: typeof data.unit === 'string' ? data.unit : 'шт',
    sellPrice: data.sellPrice == null ? undefined : Number(data.sellPrice),
    purchasePrice: data.purchasePrice == null ? undefined : Number(data.purchasePrice),
    totalOnHand,
    totalReserved,
    totalAvailable: Number(data.totalAvailable ?? totalOnHand - totalReserved),
    status: (data.status as InventoryItemStatus) ?? 'active',
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
  };
}

export function createInventoryItemRepository() {
  const db = getFirebaseDb();
  const ref = collection(db, COLLECTION);

  return {
    subscribe(
      companyId: string,
      onData: (items: InventoryItem[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const q = query(
        ref,
        where('companyId', '==', normalizeCompanyId(companyId)),
        orderBy('updatedAt', 'desc'),
        limit(500),
      );

      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapItem(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },
  };
}

export const inventoryItemRepository = createInventoryItemRepository();
