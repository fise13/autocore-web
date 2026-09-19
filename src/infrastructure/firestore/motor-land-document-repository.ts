import {
  collection,
  deleteDoc,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { getFirestoreDb } from "@/infrastructure/firebase/client";
import {
  HISTORY_LIMIT,
  coerceHistoryEntry,
  documentIdFor,
  type HistoryEntry,
} from "@/lib/motor-land/history";
import type { SaleDocumentData } from "@/lib/motor-land/sale-document";

/**
 * Waybills issued from the Motor Land document desk.
 *
 * Stored under the account that issued them (`users/{uid}/motorLandDocuments`)
 * rather than under a company: the desk is used signed in but outside any
 * workspace, so the account — not a membership — is the access boundary. The
 * waybill number is the document id, so re-issuing ПР-267 overwrites that
 * record instead of leaving two versions of the same paper.
 */
const SUBCOLLECTION = "motorLandDocuments";

export type MotorLandDocumentRepository = ReturnType<typeof createMotorLandDocumentRepository>;

export function createMotorLandDocumentRepository() {
  const db = getFirestoreDb();
  const collectionFor = (uid: string) => collection(db, "users", uid, SUBCOLLECTION);

  return {
    subscribe(
      uid: string,
      onData: (entries: HistoryEntry[]) => void,
      onError: (error: { code?: string; message: string }) => void,
      limit: number = HISTORY_LIMIT,
    ): () => void {
      return onSnapshot(
        query(collectionFor(uid), orderBy("savedAt", "desc"), limitTo(limit)),
        (snapshot) => {
          const entries: HistoryEntry[] = [];
          for (const document of snapshot.docs) {
            const entry = coerceHistoryEntry(document.id, document.data());
            if (entry) entries.push(entry);
          }
          onData(entries);
        },
        (error) => onError({ code: error.code, message: error.message }),
      );
    },

    async save(uid: string, data: SaleDocumentData, savedAt: string): Promise<void> {
      const id = documentIdFor(data.documentNumber);
      await setDoc(doc(collectionFor(uid), id), {
        savedAt,
        updatedAt: serverTimestamp(),
        data,
      });
    },

    async remove(uid: string, id: string): Promise<void> {
      await deleteDoc(doc(collectionFor(uid), id));
    },
  };
}
