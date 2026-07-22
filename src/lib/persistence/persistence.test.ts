import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldAcceptLocalWrite, diffSnapshots } from "./conflict-resolver.ts";
import { dedupeQueueByKey } from "./offline-queue.ts";
import { coalescePatches, SaveScheduler } from "./save-scheduler.ts";
import { persistenceKeyString, parsePersistenceKey } from "./types.ts";
import type { OfflineQueueItem } from "./types.ts";

describe("persistence keys", () => {
  it("round-trips key strings", () => {
    const key = { companyId: "c1", kind: "work_order_composer", id: "new:abc" };
    const raw = persistenceKeyString(key);
    assert.deepEqual(parsePersistenceKey(raw), key);
  });
});

describe("coalescePatches", () => {
  it("merges later fields over earlier ones", () => {
    const merged = coalescePatches([{ a: 1, b: 2 }, { b: 3, c: 4 }]);
    assert.deepEqual(merged, { a: 1, b: 3, c: 4 });
  });
});

describe("SaveScheduler", () => {
  it("coalesces rapid schedules into one flush", async () => {
    const scheduler = new SaveScheduler(30);
    let runs = 0;
    scheduler.schedule("k", async () => {
      runs += 1;
    });
    scheduler.schedule("k", async () => {
      runs += 1;
    });
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(runs, 1);
  });

  it("flushAll runs pending immediately", async () => {
    const scheduler = new SaveScheduler(10_000);
    let ran = false;
    scheduler.schedule("k", async () => {
      ran = true;
    });
    await scheduler.flushAll("manual");
    assert.equal(ran, true);
  });
});

describe("dedupeQueueByKey", () => {
  it("keeps the highest localRevision per key", () => {
    const items: OfflineQueueItem[] = [
      {
        opId: "1",
        key: "c::k::1",
        companyId: "c",
        kind: "branding",
        id: "1",
        payload: { v: 1 },
        baseRevision: null,
        localRevision: 1,
        createdAt: 1,
        attempts: 0,
      },
      {
        opId: "2",
        key: "c::k::1",
        companyId: "c",
        kind: "branding",
        id: "1",
        payload: { v: 2 },
        baseRevision: null,
        localRevision: 5,
        createdAt: 2,
        attempts: 0,
      },
    ];
    const deduped = dedupeQueueByKey(items);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0]?.localRevision, 5);
    assert.deepEqual(deduped[0]?.payload, { v: 2 });
  });
});

describe("conflict resolver", () => {
  it("accepts matching revisions", () => {
    const result = shouldAcceptLocalWrite({
      localBaseRevision: "2024-01-01T00:00:00.000Z",
      serverRevision: "2024-01-01T00:00:00.000Z",
    });
    assert.deepEqual(result, { accept: true, conflict: false });
  });

  it("flags conflict when server is newer", () => {
    const result = shouldAcceptLocalWrite({
      localBaseRevision: "2024-01-01T00:00:00.000Z",
      serverRevision: "2024-01-02T00:00:00.000Z",
    });
    assert.deepEqual(result, { accept: false, conflict: true });
  });

  it("diffs nested snapshots", () => {
    const diffs = diffSnapshots({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } });
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0]?.path, "b.c");
  });
});
