"use client";

import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import type { DocumentImportJob, DocumentImportStatus } from "@/domain/document-import";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";
import { toDateFromFirestore } from "@/lib/firestore-timestamp";
import { notifyFirestoreSnapshotError } from "@/lib/firestore/snapshot-errors";

const COLLECTION = "documentImports";

function mapJob(id: string, data: Record<string, unknown>): DocumentImportJob {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    createdBy: String(data.createdBy ?? ""),
    status: (data.status as DocumentImportStatus) ?? "pending",
    originalStoragePath: String(data.originalStoragePath ?? ""),
    originalDownloadUrl: String(data.originalDownloadUrl ?? ""),
    previewStoragePath:
      typeof data.previewStoragePath === "string" ? data.previewStoragePath : null,
    previewDownloadUrl:
      typeof data.previewDownloadUrl === "string" ? data.previewDownloadUrl : null,
    contentType: String(data.contentType ?? "image/jpeg"),
    fileName: typeof data.fileName === "string" ? data.fileName : undefined,
    width: typeof data.width === "number" ? data.width : undefined,
    height: typeof data.height === "number" ? data.height : undefined,
    byteSize: typeof data.byteSize === "number" ? data.byteSize : undefined,
    error: typeof data.error === "string" ? data.error : null,
    extractedData: data.extractedData ?? null,
    aiStatus: (data.aiStatus as DocumentImportJob["aiStatus"]) ?? "idle",
    createdAt: toDateFromFirestore(data.createdAt) ?? new Date(),
    updatedAt: toDateFromFirestore(data.updatedAt) ?? new Date(),
  };
}

export class DocumentImportRepository {
  subscribe(
    companyId: string,
    onData: (jobs: DocumentImportJob[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getFirestoreDb();
    const q = query(
      collection(db, COLLECTION),
      where("companyId", "==", normalizeCompanyId(companyId)),
      limit(50),
    );

    return onSnapshot(
      q,
      (snap) => {
        const jobs = snap.docs
          .map((entry) => mapJob(entry.id, entry.data() as Record<string, unknown>))
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        onData(jobs);
      },
      (error) => {
        notifyFirestoreSnapshotError(error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }

  subscribeOne(
    companyId: string,
    jobId: string,
    onData: (job: DocumentImportJob | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getFirestoreDb();
    const ref = doc(db, COLLECTION, jobId);

    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          onData(null);
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(companyId)) {
          onData(null);
          return;
        }
        onData(mapJob(snap.id, data));
      },
      (error) => {
        notifyFirestoreSnapshotError(error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }

  async getById(companyId: string, jobId: string): Promise<DocumentImportJob | null> {
    const db = getFirestoreDb();
    const snap = await getDoc(doc(db, COLLECTION, jobId));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    if (normalizeCompanyId(String(data.companyId ?? "")) !== normalizeCompanyId(companyId)) {
      return null;
    }
    return mapJob(snap.id, data);
  }
}
