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

export { PersistenceEngine, getPersistenceEngine } from "./engine";
export { SaveScheduler, coalescePatches } from "./save-scheduler";
export { DraftManager } from "./draft-manager";
export { OfflineQueue, dedupeQueueByKey } from "./offline-queue";
export { NetworkMonitor } from "./network-monitor";
export { RecoveryManager } from "./recovery-manager";
export { shouldAcceptLocalWrite, diffSnapshots } from "./conflict-resolver";
export type { FieldDiff } from "./conflict-resolver";
export { persistenceFlags } from "./flags";
export type { PersistenceStorageAdapter } from "./mobile-contract";
