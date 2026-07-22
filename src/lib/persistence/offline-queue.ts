import {
  idbDeleteQueueItem,
  idbListQueue,
  idbReplaceQueueForKey,
} from "./idb";
import {
  persistenceKeyString,
  type OfflineQueueItem,
  type PersistenceKey,
} from "./types";

function createOpId() {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Durable offline mutation queue.
 * Multiple edits for the same persistence key collapse to the latest payload.
 */
export class OfflineQueue {
  async enqueue(input: {
    key: PersistenceKey;
    payload: unknown;
    baseRevision: string | null;
    localRevision: number;
  }): Promise<OfflineQueueItem> {
    const key = persistenceKeyString(input.key);
    const item: OfflineQueueItem = {
      opId: createOpId(),
      key,
      companyId: input.key.companyId,
      kind: input.key.kind,
      id: input.key.id,
      payload: input.payload,
      baseRevision: input.baseRevision,
      localRevision: input.localRevision,
      createdAt: Date.now(),
      attempts: 0,
    };
    try {
      await idbReplaceQueueForKey(key, item);
    } catch {
      // soft-fail when IDB unavailable
    }
    return item;
  }

  async list(companyId?: string): Promise<OfflineQueueItem[]> {
    try {
      const items = await idbListQueue(companyId);
      return items.sort((a, b) => a.createdAt - b.createdAt);
    } catch {
      return [];
    }
  }

  async remove(opId: string): Promise<void> {
    try {
      await idbDeleteQueueItem(opId);
    } catch {
      // ignore
    }
  }

  async size(companyId?: string): Promise<number> {
    const items = await this.list(companyId);
    return items.length;
  }
}

/** Pure coalesce: keep highest localRevision per key. */
export function dedupeQueueByKey(items: OfflineQueueItem[]): OfflineQueueItem[] {
  const byKey = new Map<string, OfflineQueueItem>();
  for (const item of items) {
    const current = byKey.get(item.key);
    if (!current || item.localRevision >= current.localRevision) {
      byKey.set(item.key, item);
    }
  }
  return [...byKey.values()].sort((a, b) => a.createdAt - b.createdAt);
}
