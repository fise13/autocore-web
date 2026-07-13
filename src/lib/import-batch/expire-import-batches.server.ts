import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { IMPORT_BATCHES_COLLECTION } from "@/domain/import-batch";
import {
  listImportBatchFilesAdmin,
  mapImportBatch,
  updateImportBatchAdmin,
} from "@/infrastructure/firestore/admin/import-batch-admin";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { resolveAdminStorageBucket } from "@/infrastructure/firebase/resolve-storage-bucket";

/**
 * Mark expired unconfirmed batches and best-effort delete their Storage objects.
 */
export async function expireStaleImportBatches(limit = 40): Promise<{ expired: number }> {
  const db = getAdminFirestore();
  const now = Timestamp.now();
  const snap = await db
    .collection(IMPORT_BATCHES_COLLECTION)
    .where("status", "in", ["collecting", "processing", "review"])
    .where("expiresAt", "<=", now)
    .limit(limit)
    .get();

  let expired = 0;
  const bucket = await resolveAdminStorageBucket().catch(() => null);

  for (const doc of snap.docs) {
    const batch = mapImportBatch(doc.id, doc.data() as Record<string, unknown>);
    await updateImportBatchAdmin(batch.id, {
      status: "expired",
      error: "Сессия истекла (24 часа)",
    });

    if (bucket) {
      try {
        const files = await listImportBatchFilesAdmin(batch.id);
        for (const file of files) {
          if (file.storagePath) {
            await bucket.file(file.storagePath).delete({ ignoreNotFound: true });
          }
          if (file.previewStoragePath) {
            await bucket.file(file.previewStoragePath).delete({ ignoreNotFound: true });
          }
        }
      } catch (error) {
        console.warn("[expire-import-batches] storage cleanup", batch.id, error);
      }
    }

    expired += 1;
  }

  return { expired };
}
