export type PersistenceKind =
  | "work_order"
  | "work_order_composer"
  | "motor_row"
  | "motor_grid"
  | "warehouse_row"
  | "warehouse_grid"
  | "specific_row"
  | "specific_grid"
  | "branding"
  | "app_config"
  | "document_import"
  | "company_name"
  | string;

export type PersistenceKey = {
  companyId: string;
  kind: PersistenceKind;
  id: string;
};

export type PersistenceDocStatus =
  | "clean"
  | "dirty"
  | "saving"
  | "saved"
  | "offline"
  | "error"
  | "conflict";

/** Aggregated UI status for shell badge. */
export type PersistenceUiStatus =
  | "clean"
  | "dirty"
  | "saving"
  | "offline"
  | "error"
  | "conflict";

export type PersistenceFlushReason =
  | "debounce"
  | "blur"
  | "manual"
  | "route"
  | "visibility"
  | "pagehide"
  | "online"
  | "recovery";

export type PersistenceDraftRecord = {
  key: string;
  companyId: string;
  kind: PersistenceKind;
  id: string;
  snapshot: unknown;
  baseRevision: string | null;
  localRevision: number;
  updatedAt: number;
  label?: string;
};

export type OfflineQueueItem = {
  opId: string;
  key: string;
  companyId: string;
  kind: PersistenceKind;
  id: string;
  payload: unknown;
  baseRevision: string | null;
  localRevision: number;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

export type PersistenceDocumentState = {
  key: PersistenceKey;
  status: PersistenceDocStatus;
  localRevision: number;
  baseRevision: string | null;
  snapshot: unknown;
  lastSavedAt: number | null;
  lastError: string | null;
  dirty: boolean;
};

export type PersistenceSyncHandler = (input: {
  key: PersistenceKey;
  snapshot: unknown;
  baseRevision: string | null;
  reason: PersistenceFlushReason;
}) => Promise<{ ok: true; baseRevision?: string | null } | { ok: false; error: string; conflict?: boolean }>;

export type PersistenceEngineSnapshot = {
  online: boolean;
  uiStatus: PersistenceUiStatus;
  documents: PersistenceDocumentState[];
  queueSize: number;
  lastSavedAt: number | null;
  lastError: string | null;
};

export const PERSISTENCE_DEBOUNCE_MS = 1200;
export const PERSISTENCE_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const PERSISTENCE_DB_NAME = "autocore-persistence";
export const PERSISTENCE_DB_VERSION = 1;

export function persistenceKeyString(key: PersistenceKey): string {
  return `${key.companyId}::${key.kind}::${key.id}`;
}

export function parsePersistenceKey(raw: string): PersistenceKey | null {
  const parts = raw.split("::");
  if (parts.length < 3) return null;
  const [companyId, kind, ...rest] = parts;
  if (!companyId || !kind) return null;
  return { companyId, kind, id: rest.join("::") };
}
