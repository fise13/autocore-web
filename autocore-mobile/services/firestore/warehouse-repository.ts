import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';
import type { WarehouseEntity } from '@/types/warehouse';

const COLLECTION = 'warehouses';

function mapWarehouse(id: string, data: Record<string, unknown>): WarehouseEntity {
  return {
    id,
    companyId: String(data.companyId ?? ''),
    name: String(data.name ?? ''),
    code: typeof data.code === 'string' ? data.code : undefined,
    isDefault: Boolean(data.isDefault),
    address: typeof data.address === 'string' ? data.address : undefined,
  };
}

export const warehouseRepository = {
  subscribe(
    companyId: string,
    onData: (warehouses: WarehouseEntity[]) => void,
    onError?: (error: Error) => void,
  ) {
    if (!companyId) {
      onData([]);
      return () => undefined;
    }

    const q = query(
      collection(getFirebaseDb(), COLLECTION),
      where('companyId', '==', normalizeCompanyId(companyId)),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs
          .map((doc) => mapWarehouse(doc.id, doc.data() as Record<string, unknown>))
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
        onData(rows);
      },
      (error) => notifyFirestoreSnapshotError(error, onError),
    );
  },
};
