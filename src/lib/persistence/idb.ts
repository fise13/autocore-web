import {
  PERSISTENCE_DB_NAME,
  PERSISTENCE_DB_VERSION,
  type OfflineQueueItem,
  type PersistenceDraftRecord,
} from "./types";

type StoreName = "drafts" | "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(PERSISTENCE_DB_NAME, PERSISTENCE_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open persistence DB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drafts")) {
        const drafts = db.createObjectStore("drafts", { keyPath: "key" });
        drafts.createIndex("companyId", "companyId", { unique: false });
        drafts.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("queue")) {
        const queue = db.createObjectStore("queue", { keyPath: "opId" });
        queue.createIndex("key", "key", { unique: false });
        queue.createIndex("companyId", "companyId", { unique: false });
        queue.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = await run(store);
    await txDone(tx);
    return result;
  } finally {
    db.close();
  }
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function idbPutDraft(record: PersistenceDraftRecord): Promise<void> {
  await withStore("drafts", "readwrite", (store) => {
    store.put(record);
  });
}

export async function idbGetDraft(key: string): Promise<PersistenceDraftRecord | undefined> {
  return withStore("drafts", "readonly", (store) => req(store.get(key)));
}

export async function idbDeleteDraft(key: string): Promise<void> {
  await withStore("drafts", "readwrite", (store) => {
    store.delete(key);
  });
}

export async function idbListDrafts(companyId?: string): Promise<PersistenceDraftRecord[]> {
  return withStore("drafts", "readonly", async (store) => {
    if (!companyId) {
      return req(store.getAll());
    }
    const index = store.index("companyId");
    return req(index.getAll(companyId));
  });
}

export async function idbPutQueueItem(item: OfflineQueueItem): Promise<void> {
  await withStore("queue", "readwrite", (store) => {
    store.put(item);
  });
}

export async function idbGetQueueItem(opId: string): Promise<OfflineQueueItem | undefined> {
  return withStore("queue", "readonly", (store) => req(store.get(opId)));
}

export async function idbDeleteQueueItem(opId: string): Promise<void> {
  await withStore("queue", "readwrite", (store) => {
    store.delete(opId);
  });
}

export async function idbListQueue(companyId?: string): Promise<OfflineQueueItem[]> {
  return withStore("queue", "readonly", async (store) => {
    if (!companyId) {
      return req(store.getAll());
    }
    const index = store.index("companyId");
    return req(index.getAll(companyId));
  });
}

export async function idbFindQueueByKey(key: string): Promise<OfflineQueueItem[]> {
  return withStore("queue", "readonly", (store) => {
    const index = store.index("key");
    return req(index.getAll(key));
  });
}

export async function idbReplaceQueueForKey(key: string, item: OfflineQueueItem): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("queue", "readwrite");
    const store = tx.objectStore("queue");
    const index = store.index("key");
    const existing = await req(index.getAll(key));
    for (const row of existing) {
      store.delete(row.opId);
    }
    store.put(item);
    await txDone(tx);
  } finally {
    db.close();
  }
}
