import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';
import type { DocumentGenerationJobRecord } from '@/types/work-order-document';

function mapJob(id: string, data: Record<string, unknown>): DocumentGenerationJobRecord {
  return {
    id,
    companyId: String(data.companyId ?? ''),
    aggregateId: String(data.aggregateId ?? ''),
    requestedSlugs: Array.isArray(data.requestedSlugs) ? data.requestedSlugs.map(String) : [],
    completedSlugs: Array.isArray(data.completedSlugs) ? data.completedSlugs.map(String) : [],
    failedSlugs: Array.isArray(data.failedSlugs) ? data.failedSlugs.map(String) : [],
    status: (data.status as DocumentGenerationJobRecord['status']) ?? 'pending',
    error: typeof data.error === 'string' ? data.error : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
  };
}

export const documentGenerationJobRepository = {
  subscribeByAggregate(
    companyId: string,
    aggregateId: string,
    onData: (jobs: DocumentGenerationJobRecord[]) => void,
    onError?: (error: Error) => void,
  ) {
    if (!companyId || !aggregateId) {
      onData([]);
      return () => undefined;
    }

    const q = query(
      collection(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), 'documentGenerationJobs'),
      where('aggregateId', '==', aggregateId),
      orderBy('createdAt', 'desc'),
      limit(5),
    );

    return onSnapshot(
      q,
      (snapshot) => onData(snapshot.docs.map((doc) => mapJob(doc.id, doc.data() as Record<string, unknown>))),
      (error) => notifyFirestoreSnapshotError(error, onError),
    );
  },
};
