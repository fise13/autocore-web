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

function coerceInventoryString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toLocaleDateString('ru-RU');
  if (value == null) return fallback;
  return String(value);
}

export function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    sku: coerceInventoryString(item.sku),
    name: coerceInventoryString(item.name),
    unit: coerceInventoryString(item.unit, 'pc'),
    description: item.description != null ? coerceInventoryString(item.description) : undefined,
    brandName: item.brandName != null ? coerceInventoryString(item.brandName) : undefined,
    warehouseLocation:
      item.warehouseLocation != null ? coerceInventoryString(item.warehouseLocation) : undefined,
    primaryLocationId:
      item.primaryLocationId != null ? coerceInventoryString(item.primaryLocationId) : undefined,
    primaryLocationCode:
      item.primaryLocationCode != null ? coerceInventoryString(item.primaryLocationCode) : undefined,
    barcodes: item.barcodes.map((entry) => coerceInventoryString(entry)),
  };
}

function mapItem(id: string, data: Record<string, unknown>): InventoryItem {
  const totalOnHand = Number(data.totalOnHand ?? data.quantity ?? 0);
  const totalReserved = Number(data.totalReserved ?? 0);
  return normalizeInventoryItem({
    id,
    companyId: coerceInventoryString(data.companyId),
    type: (data.type as InventoryItemType) ?? 'generic',
    sku: coerceInventoryString(data.sku),
    name: coerceInventoryString(data.name),
    description:
      data.description == null ? undefined : coerceInventoryString(data.description),
    barcodes: Array.isArray(data.barcodes) ? data.barcodes.map((entry) => coerceInventoryString(entry)) : [],
    brandName: data.brandName == null ? undefined : coerceInventoryString(data.brandName),
    warehouseLocation:
      data.warehouseLocation == null ? undefined : coerceInventoryString(data.warehouseLocation),
    primaryLocationId:
      data.primaryLocationId == null ? undefined : coerceInventoryString(data.primaryLocationId),
    primaryLocationCode:
      data.primaryLocationCode == null ? undefined : coerceInventoryString(data.primaryLocationCode),
    unit: coerceInventoryString(data.unit, 'pc'),
    sellPrice: data.sellPrice == null ? undefined : Number(data.sellPrice),
    purchasePrice: data.purchasePrice == null ? undefined : Number(data.purchasePrice),
    totalOnHand,
    totalReserved,
    totalAvailable: Number(data.totalAvailable ?? totalOnHand - totalReserved),
    lowStockThreshold:
      data.lowStockThreshold == null ? undefined : Number(data.lowStockThreshold),
    status: (data.status as InventoryItemStatus) ?? 'active',
    updatedAt: toDateFromFirestore(data.updatedAt) ?? undefined,
  });
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
          onData(
            snapshot.docs
              .map((item) => mapItem(item.id, item.data() as Record<string, unknown>))
              .filter((item) => item.status === 'active' || item.status === 'discontinued'),
          ),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },
  };
}

export const inventoryItemRepository = createInventoryItemRepository();
