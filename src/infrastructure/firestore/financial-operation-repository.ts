import {
  FirestoreError,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  CreateFinancialOperationInput,
  FinancialOperation,
  OperationType,
} from "@/domain/financial-operation";
import { normalizeCompanyId } from "@/lib/company-id";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";

const COLLECTION_NAME = "financialOperations";

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function readAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapOperation(id: string, data: Record<string, unknown>): FinancialOperation | null {
  const typeRaw = String(data.type ?? "");
  const paymentMethodRaw = String(data.paymentMethod ?? "");
  const accountRaw = String(data.account ?? "");
  const amount = readAmount(data.amount);
  const createdAt = toDate(data.createdAt);

  if (
    !typeRaw ||
    !paymentMethodRaw ||
    !accountRaw ||
    amount == null ||
    !createdAt ||
    !["expense", "income", "sale", "refund"].includes(typeRaw) ||
    !["cash", "transfer", "mixed"].includes(paymentMethodRaw) ||
    !["cashbox", "kaspi"].includes(accountRaw)
  ) {
    return null;
  }

  return {
    id,
    cloudDocumentId: typeof data.cloudDocumentId === "string" ? data.cloudDocumentId : id,
    companyId: String(data.companyId ?? ""),
    type: typeRaw as OperationType,
    amount,
    paymentMethod: paymentMethodRaw as FinancialOperation["paymentMethod"],
    account: accountRaw as FinancialOperation["account"],
    cashReceived: data.cashReceived == null ? null : readAmount(data.cashReceived),
    changeGiven: data.changeGiven == null ? null : readAmount(data.changeGiven),
    relatedMotorID: data.relatedMotorID == null ? null : Number(data.relatedMotorID),
    relatedMotorId: typeof data.relatedMotorId === "string" ? data.relatedMotorId : null,
    relatedInventoryItemId:
      typeof data.relatedInventoryItemId === "string" ? data.relatedInventoryItemId : null,
    relatedMovementId: typeof data.relatedMovementId === "string" ? data.relatedMovementId : null,
    relatedWarehouseId: typeof data.relatedWarehouseId === "string" ? data.relatedWarehouseId : null,
    relatedWorkOrderId: typeof data.relatedWorkOrderId === "string" ? data.relatedWorkOrderId : null,
    costBasis: data.costBasis == null ? null : readAmount(data.costBasis),
    createdAt,
    createdByUserId: String(data.createdByUserId ?? ""),
    comment: typeof data.comment === "string" ? data.comment : null,
    category: typeof data.category === "string" ? data.category : null,
    description: typeof data.description === "string" ? data.description : null,
    source: typeof data.source === "string" ? data.source : null,
    details: typeof data.details === "string" ? data.details : null,
    updatedAt: toDate(data.updatedAt) ?? createdAt,
  };
}

export type FinancialOperationsFilters = {
  companyId: string;
  type?: OperationType | "all";
};

export type FinancialOperationRepository = ReturnType<typeof createFinancialOperationRepository>;

export function createFinancialOperationRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();

  return {
    subscribe(
      filters: FinancialOperationsFilters,
      onData: (operations: FinancialOperation[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      const companyId = normalizeCompanyId(filters.companyId);

      const operationsQuery = query(
        collection(db, COLLECTION_NAME),
        where("companyId", "==", companyId),
        orderBy("createdAt", "asc"),
      );

      return onSnapshot(
        operationsQuery,
        (snapshot) => {
          let mapped = snapshot.docs
            .map((item) => mapOperation(item.id, item.data() as Record<string, unknown>))
            .filter((item): item is FinancialOperation => item != null);

          if (filters.type && filters.type !== "all") {
            mapped = mapped.filter((item) => item.type === filters.type);
          }

          mapped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          onData(mapped);
        },
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async create(input: CreateFinancialOperationInput) {
      const payload = {
        ...input,
        companyId: normalizeCompanyId(input.companyId),
        comment: input.comment?.trim() || null,
        category: input.category?.trim() || null,
        description: input.description?.trim() || null,
        source: input.source?.trim() || null,
        details: input.details?.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
      await activity.append(payload.companyId, {
        actor: input.createdByUserId,
        action: "accounting.operation_created",
        target: `operation:${docRef.id}`,
        metadata: { type: input.type, amount: input.amount },
      });
      return docRef.id;
    },

    async update(
      id: string,
      input: Partial<Omit<CreateFinancialOperationInput, "companyId" | "createdByUserId">>,
      context?: { companyId: string; actorUid: string },
    ) {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        ...input,
        updatedAt: serverTimestamp(),
      });
      if (context?.companyId && context.actorUid) {
        await activity.append(normalizeCompanyId(context.companyId), {
          actor: context.actorUid,
          action: "accounting.operation_updated",
          target: `operation:${id}`,
        });
      }
    },

    async remove(id: string, context?: { companyId: string; actorUid: string }) {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      if (context?.companyId && context.actorUid) {
        await activity.append(normalizeCompanyId(context.companyId), {
          actor: context.actorUid,
          action: "accounting.operation_deleted",
          target: `operation:${id}`,
        });
      }
    },
  };
}
