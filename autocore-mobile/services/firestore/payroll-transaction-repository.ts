import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { toDateFromFirestore } from '@/lib/firestore-timestamp';
import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';
import type { PayrollTransaction } from '@/types/payroll-transaction';

const COLLECTION = 'payrollTransactions';

function payrollRef(companyId: string) {
  return collection(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), COLLECTION);
}

function mapPayrollTransaction(id: string, data: Record<string, unknown>): PayrollTransaction {
  return {
    id,
    companyId: String(data.companyId ?? ''),
    employeeId: String(data.employeeId ?? ''),
    workOrderId: String(data.workOrderId ?? ''),
    laborLineId: String(data.laborLineId ?? ''),
    role: String(data.role ?? ''),
    amount: Number(data.amount ?? 0),
    rateType: (data.rateType as PayrollTransaction['rateType']) ?? 'fixed',
    rate: Number(data.rate ?? 0),
    status: (data.status as PayrollTransaction['status']) ?? 'pending',
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    paidAt: toDateFromFirestore(data.paidAt),
  };
}

export type PayrollTransactionRepository = ReturnType<typeof createPayrollTransactionRepository>;

export function createPayrollTransactionRepository() {
  return {
    subscribe(
      companyId: string,
      onData: (transactions: PayrollTransaction[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }

      const q = query(payrollRef(companyId), orderBy('createdAt', 'desc'), limit(300));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(
            snapshot.docs.map((item) => mapPayrollTransaction(item.id, item.data() as Record<string, unknown>)),
          ),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },
  };
}

export const payrollTransactionRepository = createPayrollTransactionRepository();
