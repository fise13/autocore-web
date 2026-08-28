import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  commitImportPlan,
  inMemoryLedger,
  type PlanWriters,
} from "@/lib/import/business/commit-plan";
import { decision, type EntityDraft, type ImportDiscovery, type ImportEntityKind } from "@/lib/import/business/contracts";
import { buildImportPlan } from "@/lib/import/business/import-plan";

const EMPTY_DISCOVERY: ImportDiscovery = { sheets: [], ignored: [] };
const VIN_A = "JH4KA7561PC008269";

function draft(id: string, kind: ImportEntityKind, keys: EntityDraft["keys"] = []): EntityDraft {
  return {
    id,
    kind,
    values: { name: { raw: id, normalized: id, decision: decision("field", 1, "тест", "rules") } },
    sources: [{ table: "Лист1", index: Number(id.replace(/\D/g, "")) || 0, section: null }],
    keys,
    decision: decision("entity", 0.95, "тест", "rules"),
    review: [],
  };
}

function plan(entities: EntityDraft[], relationships: Parameters<typeof buildImportPlan>[0]["relationships"] = []) {
  return buildImportPlan({
    importId: "imp1",
    companyId: "c1",
    entities,
    relationships,
    discovery: EMPTY_DISCOVERY,
  });
}

function recordingWriters() {
  const calls: string[] = [];
  let counter = 0;
  const writers: PlanWriters = {
    createDonor: async (input) => {
      calls.push(`createDonor:${input.entityId}`);
      counter += 1;
      return `donor-${counter}`;
    },
    updateDonor: async (existingId, input) => {
      calls.push(`updateDonor:${existingId}:${input.entityId}`);
    },
    createEngine: async (input) => {
      calls.push(`createEngine:${input.entityId}`);
      counter += 1;
      return `engine-${counter}`;
    },
    updateEngine: async (existingId, input) => {
      calls.push(`updateEngine:${existingId}:${input.entityId}`);
    },
    createInventoryItem: async (input) => {
      calls.push(`createItem:${input.entityId}`);
      counter += 1;
      return `item-${counter}`;
    },
    updateInventoryItem: async (existingId, input) => {
      calls.push(`updateItem:${existingId}:${input.entityId}`);
    },
    linkToDonor: async (input) => {
      calls.push(`link:${input.childId}->${input.donorId}`);
    },
  };
  return { writers, calls };
}

describe("commitImportPlan", () => {
  it("writes donors before the parts that point at them", async () => {
    const { writers, calls } = recordingWriters();
    await commitImportPlan({
      plan: plan([draft("e1", "usedPart"), draft("e2", "donor"), draft("e3", "engine")]),
      writers,
    });
    assert.deepEqual(calls, ["createDonor:e2", "createEngine:e3", "createItem:e1"]);
  });

  it("attaches relationships only after both records exist", async () => {
    const { writers, calls } = recordingWriters();
    const built = plan(
      [draft("e1", "donor"), draft("e2", "usedPart")],
      [
        {
          kind: "part-of-donor",
          fromId: "e2",
          toId: "e1",
          decision: decision("relationship", 0.98, "VIN", "rules"),
        },
      ],
    );
    const result = await commitImportPlan({ plan: built, writers });
    assert.equal(result.linked, 1);
    // The link is the last call: the donor and the part are already written.
    assert.equal(calls.at(-1), "link:item-2->donor-1");
  });

  it("updates rather than creates when the plan says the record exists", async () => {
    const { writers, calls } = recordingWriters();
    const built = buildImportPlan({
      importId: "imp1",
      companyId: "c1",
      entities: [draft("e1", "donor", [{ field: "vin", value: VIN_A.toLowerCase() }])],
      relationships: [],
      discovery: EMPTY_DISCOVERY,
      existing: { donorVins: new Map([[VIN_A.toLowerCase(), "donor-existing"]]) },
    });
    const result = await commitImportPlan({ plan: built, writers });
    assert.equal(result.updated, 1);
    assert.equal(result.created, 0);
    assert.deepEqual(calls, ["updateDonor:donor-existing:e1"]);
  });

  it("never writes anything the plan left for review", async () => {
    const { writers, calls } = recordingWriters();
    const result = await commitImportPlan({
      plan: plan([draft("e1", "unknown"), draft("e2", "donor")]),
      writers,
    });
    assert.deepEqual(calls, ["createDonor:e2"]);
    assert.equal(result.review, 1);
  });

  it("resumes without creating anything twice", async () => {
    // The run that died at record 2 of 3.
    const first = recordingWriters();
    const built = plan([draft("e1", "donor"), draft("e2", "donor"), draft("e3", "donor")]);
    const ledger = inMemoryLedger();
    let processed = 0;
    await commitImportPlan({
      plan: built,
      writers: first.writers,
      ledger,
      shouldCancel: () => {
        processed += 1;
        return processed > 2;
      },
    });
    assert.equal(first.calls.length, 2);

    // The retry writes only what is missing.
    const second = recordingWriters();
    const result = await commitImportPlan({ plan: built, writers: second.writers, ledger });
    assert.equal(second.calls.length, 1);
    assert.equal(result.created, 1);
    assert.equal(result.skipped, 2);
  });

  it("keeps the ids an earlier run created, so relationships still attach", async () => {
    const built = plan(
      [draft("e1", "donor"), draft("e2", "usedPart")],
      [
        {
          kind: "part-of-donor",
          fromId: "e2",
          toId: "e1",
          decision: decision("relationship", 0.98, "VIN", "rules"),
        },
      ],
    );
    const ledger = inMemoryLedger();
    const first = recordingWriters();
    await commitImportPlan({
      plan: built,
      writers: first.writers,
      ledger,
      shouldCancel: () => first.calls.length >= 1,
    });

    const second = recordingWriters();
    const result = await commitImportPlan({ plan: built, writers: second.writers, ledger });
    assert.equal(result.linked, 1, "the donor written last time is still linkable");
  });

  it("carries on past a record that fails to save", async () => {
    const { writers, calls } = recordingWriters();
    const failing: PlanWriters = {
      ...writers,
      createDonor: async (input) => {
        if (input.entityId === "e1") throw new Error("Firestore недоступен");
        calls.push(`createDonor:${input.entityId}`);
        return "donor-ok";
      },
    };
    const result = await commitImportPlan({
      plan: plan([draft("e1", "donor"), draft("e2", "donor")]),
      writers: failing,
    });
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0]!.entityId, "e1");
    assert.equal(result.created, 1);
  });

  it("reports progress against the actions it will actually run", async () => {
    const { writers } = recordingWriters();
    const seen: Array<[number, number]> = [];
    await commitImportPlan({
      plan: plan([draft("e1", "donor"), draft("e2", "unknown"), draft("e3", "donor")]),
      writers,
      onProgress: (done, total) => seen.push([done, total]),
    });
    // The unknown row is not work; the bar must not promise it.
    assert.deepEqual(seen, [
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("commitImportPlan — a real book's worth of records", () => {
  /**
   * 2,264 records is what a customer actually uploaded, and one-at-a-time
   * writing is why the progress bar sat at "0 / 2264" until the platform
   * killed the request. These tests are about the two properties that fixed
   * it: writes overlap, and a call that cannot finish says how far it got
   * instead of dying.
   */
  function bigPlan(count: number) {
    return plan(Array.from({ length: count }, (_, index) => draft(`e${index}`, "engine")));
  }

  function slowWriters(latencyMs: number) {
    let inFlight = 0;
    let peak = 0;
    let written = 0;
    const base = recordingWriters();
    const writers: PlanWriters = {
      ...base.writers,
      createEngine: async (input) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, latencyMs));
        inFlight -= 1;
        written += 1;
        return `engine-${input.entityId}`;
      },
    };
    return { writers, peak: () => peak, written: () => written };
  }

  it("writes records at the same time instead of one after another", async () => {
    const slow = slowWriters(5);
    const started = Date.now();
    const result = await commitImportPlan({
      plan: bigPlan(120),
      writers: slow.writers,
      concurrency: 12,
    });

    assert.equal(result.created, 120);
    assert.equal(result.remaining, 0);
    assert.equal(slow.peak(), 12);
    // Sequential would be 120 x 5ms = 600ms at the very least.
    assert.ok(Date.now() - started < 400, "twelve at a time must beat one at a time");
  });

  it("stops at its deadline and reports what is left rather than timing out", async () => {
    let clock = 1_000;
    const result = await commitImportPlan({
      plan: bigPlan(100),
      writers: recordingWriters().writers,
      concurrency: 1,
      now: () => (clock += 1),
      deadlineAt: 1_010,
      ledger: inMemoryLedger(),
    });

    // The clock only moves when an action is attempted, so exactly ten run.
    assert.ok(result.created > 0 && result.created < 100);
    assert.equal(result.created + result.remaining, 100);
    assert.equal(result.total, 100);
  });

  it("a second call finishes what the first one could not, writing nothing twice", async () => {
    const built = bigPlan(50);
    const ledger = inMemoryLedger();
    let clock = 0;
    const first = recordingWriters();
    const firstRun = await commitImportPlan({
      plan: built,
      writers: first.writers,
      ledger,
      concurrency: 1,
      now: () => (clock += 1),
      deadlineAt: 20,
    });
    assert.ok(firstRun.remaining > 0, "the first call must not finish");

    const second = recordingWriters();
    const secondRun = await commitImportPlan({
      plan: built,
      writers: second.writers,
      ledger,
      concurrency: 4,
    });

    assert.equal(secondRun.remaining, 0);
    assert.equal(firstRun.created + secondRun.created, 50);
    assert.equal(secondRun.skipped, firstRun.created);

    // Nothing was created twice: every entity was written by exactly one run.
    const createdIds = [...first.calls, ...second.calls].filter((call) =>
      call.startsWith("createEngine:"),
    );
    assert.equal(new Set(createdIds).size, createdIds.length);
    assert.equal(createdIds.length, 50);
  });

  it("does not attach relationships while records are still unwritten", async () => {
    const built = plan(
      [draft("e1", "donor"), draft("e2", "usedPart")],
      [
        {
          kind: "part-of-donor",
          fromId: "e2",
          toId: "e1",
          decision: decision("relationship", 0.98, "VIN", "rules"),
        },
      ],
    );
    let clock = 0;
    const { writers, calls } = recordingWriters();
    const result = await commitImportPlan({
      plan: built,
      writers,
      concurrency: 1,
      now: () => (clock += 10),
      deadlineAt: 15,
    });

    assert.ok(result.remaining > 0);
    assert.equal(result.linked, 0);
    assert.ok(!calls.some((call) => call.startsWith("link:")), "no dangling link may be written");
  });

  it("reports progress that only ever moves forward", async () => {
    const seen: number[] = [];
    await commitImportPlan({
      plan: bigPlan(40),
      writers: recordingWriters().writers,
      concurrency: 8,
      onProgress: (done, total) => {
        assert.equal(total, 40);
        seen.push(done);
      },
    });
    assert.equal(seen.length, 40);
    assert.deepEqual([...seen].sort((a, b) => a - b), seen);
    assert.equal(seen.at(-1), 40);
  });
});

describe("commitImportPlan — catalogue units", () => {
  it("writes transmissions through the specific-record writer when one exists", async () => {
    const calls: string[] = [];
    const writers: PlanWriters = {
      ...recordingWriters().writers,
      createSpecificRecord: async (input) => {
        calls.push(`specific:${input.recordType}:${input.values.serial}`);
        return "spec-1";
      },
    };
    const entity = draft("e1", "stockItem");
    entity.recordType = "transmission";
    entity.values.serial = {
      raw: "TZ1A4",
      normalized: "TZ1A4",
      decision: decision("field", 1, "тест", "rules"),
    };
    entity.keys = [{ field: "serial", value: "tz1a4" }];
    const result = await commitImportPlan({ plan: plan([entity]), writers });
    assert.deepEqual(calls, ["specific:transmission:TZ1A4"]);
    assert.equal(result.created, 1);
  });
});
