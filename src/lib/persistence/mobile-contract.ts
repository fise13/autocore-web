/**
 * Shared persistence contracts for future mobile (Expo) adapters.
 * Web uses IndexedDB; mobile should map the same key/status model to MMKV/SQLite.
 *
 * Do not import React or web-only APIs here — keep this portable.
 */

export type {
  PersistenceKey,
  PersistenceKind,
  PersistenceDocStatus,
  PersistenceUiStatus,
  PersistenceFlushReason,
  PersistenceDraftRecord,
  OfflineQueueItem,
  PersistenceDocumentState,
  PersistenceSyncHandler,
  PersistenceEngineSnapshot,
} from "./types";

export {
  PERSISTENCE_DEBOUNCE_MS,
  PERSISTENCE_DRAFT_TTL_MS,
  persistenceKeyString,
  parsePersistenceKey,
} from "./types";

export { coalescePatches } from "./save-scheduler";
export { dedupeQueueByKey } from "./offline-queue";
export { shouldAcceptLocalWrite, diffSnapshots } from "./conflict-resolver";

/**
 * Storage adapter interface for non-web runtimes.
 * Mobile implements this with MMKV (drafts) + SQLite (queue) later.
 */
export type PersistenceStorageAdapter = {
  putDraft(record: import("./types").PersistenceDraftRecord): Promise<void>;
  getDraft(key: string): Promise<import("./types").PersistenceDraftRecord | null>;
  deleteDraft(key: string): Promise<void>;
  listDrafts(companyId?: string): Promise<import("./types").PersistenceDraftRecord[]>;
  replaceQueueItem(item: import("./types").OfflineQueueItem): Promise<void>;
  listQueue(companyId?: string): Promise<import("./types").OfflineQueueItem[]>;
  deleteQueueItem(opId: string): Promise<void>;
};
