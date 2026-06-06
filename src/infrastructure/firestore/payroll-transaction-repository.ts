import {
  collection,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { PayrollTransaction, PayrollTransactionStatus } from "@/domain/payroll-transaction";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "payrollTransactions";

function payrollRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function mapPayrollTransaction(id: string, data: Record<string, unknown>): PayrollTransaction {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    employeeId: String(data.employeeId ?? ""),
    workOrderId: String(data.workOrderId ?? ""),
    laborLineId: String(data.laborLineId ?? ""),
    role: data.role as PayrollTransaction["role"],
    amount: Number(data.amount ?? 0),
    rateType: data.rateType as PayrollTransaction["rateType"],
    rate: Number(data.rate ?? 0),
    status: (data.status as PayrollTransaction["status"]) ?? "pending",
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    paidAt: toDateFromFirestore(data.paidAt) ?? undefined,
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

      const q = query(payrollRef(companyId), orderBy("createdAt", "desc"), limit(300));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapPayrollTransaction(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    subscribeByEmployee(
      companyId: string,
      employeeId: string,
      onData: (transactions: PayrollTransaction[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !employeeId) {
        onData([]);
        return () => undefined;
      }

      const q = query(
        payrollRef(companyId),
        where("employeeId", "==", employeeId),
        orderBy("createdAt", "desc"),
        limit(100),
      );
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapPayrollTransaction(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async updateStatus(companyId: string, id: string, status: PayrollTransactionStatus) {
      const db = getFirestoreDb();
      const ref = doc(db, "companies", normalizeCompanyId(companyId), COLLECTION, id);
      await updateDoc(ref, {
        status,
        paidAt: status === "paid" ? serverTimestamp() : deleteField(),
      });
    },

    collectionRef: payrollRef,
    mapPayrollTransaction,
  };
}
