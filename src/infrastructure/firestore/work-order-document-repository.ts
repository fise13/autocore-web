import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";

import { WorkOrderDocument } from "@/domain/work-order";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "workOrderDocuments";

function documentsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function mapWorkOrderDocument(id: string, data: Record<string, unknown>): WorkOrderDocument {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    workOrderId: String(data.workOrderId ?? ""),
    type: data.type as WorkOrderDocument["type"],
    title: String(data.title ?? ""),
    storagePath: typeof data.storagePath === "string" ? data.storagePath : undefined,
    downloadUrl: typeof data.downloadUrl === "string" ? data.downloadUrl : undefined,
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
  };
}

export type WorkOrderDocumentRepository = ReturnType<typeof createWorkOrderDocumentRepository>;

export function createWorkOrderDocumentRepository() {
  return {
    subscribeByWorkOrder(
      companyId: string,
      workOrderId: string,
      onData: (documents: WorkOrderDocument[]) => void,
      onError?: (error: Error) => void,
    ) {
      if (!companyId || !workOrderId) {
        onData([]);
        return () => undefined;
      }

      const q = query(
        documentsRef(companyId),
        where("workOrderId", "==", workOrderId),
        orderBy("createdAt", "desc"),
        limit(20),
      );
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapWorkOrderDocument(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    collectionRef: documentsRef,
    mapWorkOrderDocument,
  };
}
