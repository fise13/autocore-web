import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { StocktakeLine, StocktakeSession, StocktakeStatus } from "@/domain/stocktake";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "stocktakeSessions";

function sessionsRef(companyId: string) {
  return collection(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION);
}

function sessionRef(companyId: string, sessionId: string) {
  return doc(getFirestoreDb(), "companies", normalizeCompanyId(companyId), COLLECTION, sessionId);
}

function mapSession(id: string, data: Record<string, unknown>): StocktakeSession {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    warehouseId: typeof data.warehouseId === "string" ? data.warehouseId : undefined,
    status: (data.status as StocktakeStatus) ?? "open",
    lines: Array.isArray(data.lines) ? (data.lines as StocktakeLine[]) : [],
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
    createdByUserId: String(data.createdByUserId ?? ""),
    committedAt: toDateFromFirestore(data.committedAt),
  };
}

export type StocktakeRepository = ReturnType<typeof createStocktakeRepository>;

export function createStocktakeRepository() {
  return {
    subscribe(companyId: string, onData: (sessions: StocktakeSession[]) => void, onError?: (error: Error) => void) {
      if (!companyId) {
        onData([]);
        return () => undefined;
      }
      const q = query(sessionsRef(companyId), orderBy("updatedAt", "desc"), limit(20));
      return onSnapshot(
        q,
        (snapshot) =>
          onData(snapshot.docs.map((item) => mapSession(item.id, item.data() as Record<string, unknown>))),
        (error) => notifyFirestoreSnapshotError(error, onError),
      );
    },

    async create(input: {
      companyId: string;
      warehouseId?: string;
      lines: StocktakeLine[];
      createdByUserId: string;
    }): Promise<StocktakeSession> {
      const ref = doc(sessionsRef(input.companyId));
      await setDoc(ref, {
        companyId: normalizeCompanyId(input.companyId),
        warehouseId: input.warehouseId ?? null,
        status: "open",
        lines: input.lines,
        createdByUserId: input.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const snap = await getDoc(ref);
      return mapSession(snap.id, snap.data() as Record<string, unknown>);
    },

    async updateLines(companyId: string, sessionId: string, lines: StocktakeLine[]) {
      await updateDoc(sessionRef(companyId, sessionId), {
        lines,
        updatedAt: serverTimestamp(),
      });
    },

    async markCommitted(companyId: string, sessionId: string) {
      await updateDoc(sessionRef(companyId, sessionId), {
        status: "committed",
        committedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
  };
}
