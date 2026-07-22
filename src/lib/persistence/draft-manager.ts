import { idbDeleteDraft, idbGetDraft, idbListDrafts, idbPutDraft } from "./idb";
import {
  PERSISTENCE_DRAFT_TTL_MS,
  persistenceKeyString,
  type PersistenceDraftRecord,
  type PersistenceKey,
} from "./types";

export class DraftManager {
  async save(input: {
    key: PersistenceKey;
    snapshot: unknown;
    baseRevision: string | null;
    localRevision: number;
    label?: string;
  }): Promise<void> {
    const record: PersistenceDraftRecord = {
      key: persistenceKeyString(input.key),
      companyId: input.key.companyId,
      kind: input.key.kind,
      id: input.key.id,
      snapshot: input.snapshot,
      baseRevision: input.baseRevision,
      localRevision: input.localRevision,
      updatedAt: Date.now(),
      label: input.label,
    };
    try {
      await idbPutDraft(record);
    } catch {
      // IndexedDB may be unavailable (private mode) — soft-fail.
    }
  }

  async get(key: PersistenceKey): Promise<PersistenceDraftRecord | null> {
    try {
      const record = await idbGetDraft(persistenceKeyString(key));
      return record ?? null;
    } catch {
      return null;
    }
  }

  async remove(key: PersistenceKey): Promise<void> {
    try {
      await idbDeleteDraft(persistenceKeyString(key));
    } catch {
      // ignore
    }
  }

  async list(companyId: string, kind?: string): Promise<PersistenceDraftRecord[]> {
    try {
      const all = await idbListDrafts(companyId);
      return kind ? all.filter((row) => row.kind === kind) : all;
    } catch {
      return [];
    }
  }

  async pruneExpired(now = Date.now()): Promise<number> {
    try {
      const all = await idbListDrafts();
      let removed = 0;
      for (const row of all) {
        if (now - row.updatedAt > PERSISTENCE_DRAFT_TTL_MS) {
          await idbDeleteDraft(row.key);
          removed += 1;
        }
      }
      return removed;
    } catch {
      return 0;
    }
  }
}
