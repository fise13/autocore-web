import { DraftManager } from "./draft-manager";
import { NetworkMonitor } from "./network-monitor";
import { OfflineQueue } from "./offline-queue";
import { SaveScheduler } from "./save-scheduler";
import {
  persistenceKeyString,
  type PersistenceDocumentState,
  type PersistenceDraftRecord,
  type PersistenceEngineSnapshot,
  type PersistenceFlushReason,
  type PersistenceKey,
  type PersistenceSyncHandler,
  type PersistenceUiStatus,
} from "./types";

type DocInternal = {
  key: PersistenceKey;
  status: PersistenceDocumentState["status"];
  localRevision: number;
  baseRevision: string | null;
  snapshot: unknown;
  lastSavedAt: number | null;
  lastError: string | null;
  dirty: boolean;
  label?: string;
  sync: PersistenceSyncHandler | null;
};

type EngineListener = (snapshot: PersistenceEngineSnapshot) => void;

export class PersistenceEngine {
  readonly network = new NetworkMonitor();
  readonly drafts = new DraftManager();
  readonly queue = new OfflineQueue();
  readonly scheduler = new SaveScheduler();

  private docs = new Map<string, DocInternal>();
  private listeners = new Set<EngineListener>();
  private draining = false;
  private started = false;

  start() {
    if (this.started) return;
    this.started = true;
    this.network.start();
    this.network.subscribe((online) => {
      this.emit();
      if (online) void this.drainQueue();
    });
    void this.drafts.pruneExpired();
  }

  stop() {
    this.network.stop();
    this.started = false;
  }

  subscribe(listener: EngineListener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PersistenceEngineSnapshot {
    const documents = [...this.docs.values()].map((doc) => ({
      key: doc.key,
      status: doc.status,
      localRevision: doc.localRevision,
      baseRevision: doc.baseRevision,
      snapshot: doc.snapshot,
      lastSavedAt: doc.lastSavedAt,
      lastError: doc.lastError,
      dirty: doc.dirty,
    }));

    const online = this.network.isOnline();
    let queueSize = 0;
    // queueSize is refreshed async; callers can use refreshQueueSize
    for (const doc of this.docs.values()) {
      if (doc.status === "offline") queueSize += 1;
    }

    return {
      online,
      uiStatus: this.computeUiStatus(documents, online),
      documents,
      queueSize,
      lastSavedAt: documents.reduce<number | null>((max, doc) => {
        if (doc.lastSavedAt == null) return max;
        return max == null ? doc.lastSavedAt : Math.max(max, doc.lastSavedAt);
      }, null),
      lastError: documents.find((doc) => doc.lastError)?.lastError ?? null,
    };
  }

  register(input: {
    key: PersistenceKey;
    snapshot?: unknown;
    baseRevision?: string | null;
    label?: string;
    sync?: PersistenceSyncHandler | null;
  }) {
    const keyStr = persistenceKeyString(input.key);
    const existing = this.docs.get(keyStr);
    if (existing) {
      if (input.sync !== undefined) existing.sync = input.sync;
      if (input.label !== undefined) existing.label = input.label;
      if (input.baseRevision !== undefined && !existing.dirty) {
        existing.baseRevision = input.baseRevision;
      }
      if (input.snapshot !== undefined && !existing.dirty) {
        existing.snapshot = input.snapshot;
      }
      this.emit();
      return;
    }

    this.docs.set(keyStr, {
      key: input.key,
      status: "clean",
      localRevision: 0,
      baseRevision: input.baseRevision ?? null,
      snapshot: input.snapshot ?? null,
      lastSavedAt: null,
      lastError: null,
      dirty: false,
      label: input.label,
      sync: input.sync ?? null,
    });
    this.emit();
  }

  unregister(key: PersistenceKey) {
    const keyStr = persistenceKeyString(key);
    this.scheduler.cancel(keyStr);
    this.docs.delete(keyStr);
    this.emit();
  }

  setSyncHandler(key: PersistenceKey, sync: PersistenceSyncHandler | null) {
    const doc = this.docs.get(persistenceKeyString(key));
    if (!doc) return;
    doc.sync = sync;
  }

  /**
   * Apply a local patch. Always writes a draft; schedules debounced cloud sync.
   */
  async patch(input: {
    key: PersistenceKey;
    snapshot: unknown;
    label?: string;
    schedule?: boolean;
  }) {
    this.start();
    const keyStr = persistenceKeyString(input.key);
    let doc = this.docs.get(keyStr);
    if (!doc) {
      this.register({ key: input.key, snapshot: input.snapshot, label: input.label });
      doc = this.docs.get(keyStr)!;
    }

    doc.localRevision += 1;
    doc.snapshot = input.snapshot;
    doc.dirty = true;
    doc.status = this.network.isOnline() ? "dirty" : "offline";
    doc.lastError = null;
    if (input.label) doc.label = input.label;

    await this.drafts.save({
      key: input.key,
      snapshot: input.snapshot,
      baseRevision: doc.baseRevision,
      localRevision: doc.localRevision,
      label: doc.label,
    });

    this.emit();

    if (input.schedule === false) return;

    this.scheduler.schedule(keyStr, async (reason) => {
      await this.flushKey(keyStr, reason);
    });
  }

  async flush(key: PersistenceKey, reason: PersistenceFlushReason = "manual") {
    await this.flushKey(persistenceKeyString(key), reason);
  }

  async flushAll(reason: PersistenceFlushReason = "manual") {
    await this.scheduler.flushAll(reason);
    const dirtyKeys = [...this.docs.entries()]
      .filter(([, doc]) => doc.dirty)
      .map(([key]) => key);
    for (const key of dirtyKeys) {
      await this.flushKey(key, reason);
    }
  }

  async markClean(key: PersistenceKey, baseRevision?: string | null) {
    const doc = this.docs.get(persistenceKeyString(key));
    if (!doc) return;
    doc.dirty = false;
    doc.status = "saved";
    doc.lastSavedAt = Date.now();
    doc.lastError = null;
    if (baseRevision !== undefined) doc.baseRevision = baseRevision;
    await this.drafts.remove(key);
    this.emit();
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (!doc.dirty && doc.status === "saved") {
          doc.status = "clean";
          this.emit();
        }
      }, 1200);
    }
  }

  async discardDraft(key: PersistenceKey) {
    await this.drafts.remove(key);
    const doc = this.docs.get(persistenceKeyString(key));
    if (doc) {
      doc.dirty = false;
      doc.status = "clean";
      doc.lastError = null;
      this.scheduler.cancel(persistenceKeyString(key));
    }
    this.emit();
  }

  async findRecoverableDrafts(companyId: string, kind?: string): Promise<PersistenceDraftRecord[]> {
    return this.drafts.list(companyId, kind);
  }

  async drainQueue() {
    if (this.draining || !this.network.isOnline()) return;
    this.draining = true;
    try {
      const items = await this.queue.list();
      for (const item of items) {
        const doc = this.docs.get(item.key);
        const sync = doc?.sync;
        if (!sync) {
          // Keep queued until a handler is registered for this key.
          continue;
        }
        try {
          const result = await sync({
            key: {
              companyId: item.companyId,
              kind: item.kind,
              id: item.id,
            },
            snapshot: item.payload,
            baseRevision: item.baseRevision,
            reason: "online",
          });
          if (result.ok) {
            await this.queue.remove(item.opId);
            if (doc) {
              doc.dirty = false;
              doc.status = "saved";
              doc.lastSavedAt = Date.now();
              doc.baseRevision = result.baseRevision ?? doc.baseRevision;
              await this.drafts.remove(doc.key);
            }
          }
        } catch (error) {
          item.attempts += 1;
          item.lastError = error instanceof Error ? error.message : "Sync failed";
          await this.queue.enqueue({
            key: {
              companyId: item.companyId,
              kind: item.kind,
              id: item.id,
            },
            payload: item.payload,
            baseRevision: item.baseRevision,
            localRevision: item.localRevision,
          });
          await this.queue.remove(item.opId);
        }
      }
    } finally {
      this.draining = false;
      this.emit();
    }
  }

  hasUnsavedChanges() {
    return [...this.docs.values()].some((doc) => doc.dirty) || this.scheduler.hasPending();
  }

  private async flushKey(keyStr: string, reason: PersistenceFlushReason) {
    const doc = this.docs.get(keyStr);
    if (!doc || !doc.dirty) {
      this.scheduler.cancel(keyStr);
      return;
    }

    if (!this.network.isOnline()) {
      await this.queue.enqueue({
        key: doc.key,
        payload: doc.snapshot,
        baseRevision: doc.baseRevision,
        localRevision: doc.localRevision,
      });
      doc.status = "offline";
      this.emit();
      return;
    }

    if (!doc.sync) {
      // No sync handler — durable draft already saved; treat as local-only dirty.
      doc.status = "dirty";
      this.emit();
      return;
    }

    doc.status = "saving";
    doc.lastError = null;
    this.emit();

    try {
      const result = await doc.sync({
        key: doc.key,
        snapshot: doc.snapshot,
        baseRevision: doc.baseRevision,
        reason,
      });
      if (!result.ok) {
        doc.status = result.conflict ? "conflict" : "error";
        doc.lastError = result.error;
        this.emit();
        return;
      }
      doc.dirty = false;
      doc.status = "saved";
      doc.lastSavedAt = Date.now();
      doc.baseRevision = result.baseRevision ?? doc.baseRevision;
      await this.drafts.remove(doc.key);
      this.emit();
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (!doc.dirty && doc.status === "saved") {
            doc.status = "clean";
            this.emit();
          }
        }, 1200);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      if (!this.network.isOnline()) {
        await this.queue.enqueue({
          key: doc.key,
          payload: doc.snapshot,
          baseRevision: doc.baseRevision,
          localRevision: doc.localRevision,
        });
        doc.status = "offline";
      } else {
        doc.status = "error";
        doc.lastError = message;
      }
      this.emit();
    }
  }

  private computeUiStatus(
    documents: PersistenceDocumentState[],
    online: boolean,
  ): PersistenceUiStatus {
    if (!online || documents.some((doc) => doc.status === "offline")) return "offline";
    if (documents.some((doc) => doc.status === "conflict")) return "conflict";
    if (documents.some((doc) => doc.status === "error")) return "error";
    if (documents.some((doc) => doc.status === "saving")) return "saving";
    if (documents.some((doc) => doc.dirty || doc.status === "dirty")) return "dirty";
    return "clean";
  }

  private emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

let singleton: PersistenceEngine | null = null;

export function getPersistenceEngine(): PersistenceEngine {
  if (!singleton) singleton = new PersistenceEngine();
  return singleton;
}
