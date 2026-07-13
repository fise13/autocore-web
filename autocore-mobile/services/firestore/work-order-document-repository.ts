import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';
import type { WorkOrderDocumentRecord } from '@/types/work-order-document';

const COLLECTION = 'workOrderDocuments';

function documentsRef(companyId: string) {
  return collection(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), COLLECTION);
}

function mapWorkOrderDocument(id: string, data: Record<string, unknown>): WorkOrderDocumentRecord {
  return {
    id,
    companyId: String(data.companyId ?? ''),
    workOrderId: String(data.workOrderId ?? ''),
    type: data.type as WorkOrderDocumentRecord['type'],
    title: String(data.title ?? ''),
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    status: data.status as WorkOrderDocumentRecord['status'],
    storagePath: typeof data.storagePath === 'string' ? data.storagePath : undefined,
    downloadUrl: typeof data.downloadUrl === 'string' ? data.downloadUrl : undefined,
    contextHash: typeof data.contextHash === 'string' ? data.contextHash : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
  };
}

export const workOrderDocumentRepository = {
  subscribeByWorkOrder(
    companyId: string,
    workOrderId: string,
    onData: (documents: WorkOrderDocumentRecord[]) => void,
    onError?: (error: Error) => void,
  ) {
    if (!companyId || !workOrderId) {
      onData([]);
      return () => undefined;
    }

    const q = query(
      documentsRef(companyId),
      where('workOrderId', '==', workOrderId),
      orderBy('createdAt', 'desc'),
      limit(20),
    );

    return onSnapshot(
      q,
      (snapshot) =>
        onData(snapshot.docs.map((item) => mapWorkOrderDocument(item.id, item.data() as Record<string, unknown>))),
      (error) => notifyFirestoreSnapshotError(error, onError),
    );
  },
};
