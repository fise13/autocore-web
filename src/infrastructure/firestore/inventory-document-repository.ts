import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { InventoryDocument, InventoryDocumentType } from "@/domain/inventory-document";
import { createActivityLogRepository } from "@/infrastructure/firestore/activity-log-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";

const COLLECTION = "documents";

function mapDocument(id: string, data: Record<string, unknown>): InventoryDocument {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    type: data.type as InventoryDocumentType,
    status: (data.status as InventoryDocument["status"]) ?? "draft",
    referenceType: typeof data.referenceType === "string" ? data.referenceType : undefined,
    referenceId: typeof data.referenceId === "string" ? data.referenceId : undefined,
    movementIds: Array.isArray(data.movementIds) ? data.movementIds.map(String) : [],
    storagePath: typeof data.storagePath === "string" ? data.storagePath : undefined,
    exportPath: typeof data.exportPath === "string" ? data.exportPath : undefined,
    metadata: (data.metadata as Record<string, string>) ?? {},
    createdByUserId: String(data.createdByUserId ?? ""),
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
  };
}

export type InventoryDocumentRepository = ReturnType<typeof createInventoryDocumentRepository>;

export function createInventoryDocumentRepository() {
  const db = getFirestoreDb();
  const activity = createActivityLogRepository();
  const ref = collection(db, COLLECTION);

  return {
    async createDraft(input: {
      companyId: string;
      type: InventoryDocumentType;
      referenceType?: string;
      referenceId?: string;
      movementIds?: string[];
      metadata?: Record<string, string>;
      createdByUserId: string;
    }): Promise<string> {
      const normalizedCompanyId = normalizeCompanyId(input.companyId);
      const created = await addDoc(ref, {
        companyId: normalizedCompanyId,
        type: input.type,
        status: "draft",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        movementIds: input.movementIds ?? [],
        metadata: input.metadata ?? {},
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
      });
      await activity.append(normalizedCompanyId, {
        actor: input.createdByUserId,
        action: "inventory.document_created",
        target: `document:${created.id}`,
        targetId: created.id,
      });
      return created.id;
    },

    async finalize(documentId: string, storagePath: string, exportPath?: string): Promise<void> {
      await updateDoc(doc(db, COLLECTION, documentId), {
        status: "finalized",
        storagePath,
        exportPath: exportPath ?? null,
        updatedAt: serverTimestamp(),
      });
    },

    mapDocument,
  };
}
