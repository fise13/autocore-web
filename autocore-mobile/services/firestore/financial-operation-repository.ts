import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { dateMs, toDateFromFirestore } from '@/lib/firestore-timestamp';
import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';
import type { CreateFinancialOperationInput, FinancialOperation, OperationType } from '@/types/financial-operation';

const COLLECTION_NAME = 'financialOperations';

function readAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapOperation(id: string, data: Record<string, unknown>): FinancialOperation | null {
  const typeRaw = String(data.type ?? '');
  const paymentMethodRaw = String(data.paymentMethod ?? '');
  const accountRaw = String(data.account ?? '');
  const amount = readAmount(data.amount);
  const createdAt = toDateFromFirestore(data.createdAt);

  if (
    !typeRaw ||
    !paymentMethodRaw ||
    !accountRaw ||
    amount == null ||
    !createdAt ||
    !['expense', 'income', 'sale', 'refund', 'transfer'].includes(typeRaw) ||
    !['cash', 'transfer', 'mixed'].includes(paymentMethodRaw) ||
    !['cashbox', 'kaspi'].includes(accountRaw)
  ) {
    return null;
  }

  return {
    id,
    cloudDocumentId: typeof data.cloudDocumentId === 'string' ? data.cloudDocumentId : id,
    companyId: String(data.companyId ?? ''),
    type: typeRaw as OperationType,
    amount,
    paymentMethod: paymentMethodRaw as FinancialOperation['paymentMethod'],
    account: accountRaw as FinancialOperation['account'],
    cashReceived: data.cashReceived == null ? null : readAmount(data.cashReceived),
    changeGiven: data.changeGiven == null ? null : readAmount(data.changeGiven),
    relatedMotorID: data.relatedMotorID == null ? null : Number(data.relatedMotorID),
    relatedMotorId: typeof data.relatedMotorId === 'string' ? data.relatedMotorId : null,
    relatedWarrantyId: typeof data.relatedWarrantyId === 'string' ? data.relatedWarrantyId : null,
    relatedClientId: typeof data.relatedClientId === 'string' ? data.relatedClientId : null,
    relatedInventoryItemId:
      typeof data.relatedInventoryItemId === 'string' ? data.relatedInventoryItemId : null,
    relatedMovementId: typeof data.relatedMovementId === 'string' ? data.relatedMovementId : null,
    relatedWarehouseId: typeof data.relatedWarehouseId === 'string' ? data.relatedWarehouseId : null,
    relatedWorkOrderId: typeof data.relatedWorkOrderId === 'string' ? data.relatedWorkOrderId : null,
    costBasis: data.costBasis == null ? null : readAmount(data.costBasis),
    createdAt,
    createdByUserId: String(data.createdByUserId ?? ''),
    comment: typeof data.comment === 'string' ? data.comment : null,
    category: typeof data.category === 'string' ? data.category : null,
    description: typeof data.description === 'string' ? data.description : null,
    source: typeof data.source === 'string' ? data.source : null,
    details: typeof data.details === 'string' ? data.details : null,
    updatedAt: toDateFromFirestore(data.updatedAt) ?? createdAt,
  };
}

export type FinancialOperationsFilters = {
  companyId: string;
  type?: OperationType | 'all';
};

export type FinancialOperationRepository = ReturnType<typeof createFinancialOperationRepository>;

export function createFinancialOperationRepository() {
  return {
    subscribe(
      filters: FinancialOperationsFilters,
      onData: (operations: FinancialOperation[]) => void,
      onError?: (error: Error) => void,
    ) {
      const companyId = normalizeCompanyId(filters.companyId);
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const operationsQuery = query(
        collection(getFirebaseDb(), COLLECTION_NAME),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'asc'),
      );

      return onSnapshot(
        operationsQuery,
        (snapshot) => {
          let mapped = snapshot.docs
            .map((item) => mapOperation(item.id, item.data() as Record<string, unknown>))
            .filter((item): item is FinancialOperation => item != null);

          if (filters.type && filters.type !== 'all') {
            mapped = mapped.filter((item) => item.type === filters.type);
          }

          mapped.sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt));
          onData(mapped);
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async create(input: CreateFinancialOperationInput): Promise<string> {
      const payload = {
        ...input,
        companyId: normalizeCompanyId(input.companyId),
        comment: input.comment?.trim() || null,
        category: input.category?.trim() || null,
        description: input.description?.trim() || null,
        source: input.source?.trim() || null,
        details: input.details?.trim() || null,
        relatedClientId: input.relatedClientId?.trim() || null,
        relatedMotorId: input.relatedMotorId?.trim() || null,
        relatedMotorID: input.relatedMotorID ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(getFirebaseDb(), COLLECTION_NAME), payload);
      return docRef.id;
    },

    async delete(id: string): Promise<void> {
      await deleteDoc(doc(getFirebaseDb(), COLLECTION_NAME, id));
    },
  };
}

export const financialOperationRepository = createFinancialOperationRepository();
