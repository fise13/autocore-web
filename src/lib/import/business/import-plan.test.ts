import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decision, type EntityDraft, type ImportDiscovery } from "@/lib/import/business/contracts";
import {
  actionFingerprint,
  buildImportPlan,
  committableActions,
  FINANCIAL_REVIEW_THRESHOLD,
} from "@/lib/import/business/import-plan";
import type { ImportEntityKind } from "@/lib/import/business/contracts";

const VIN_A = "JH4KA7561PC008269";

const EMPTY_DISCOVERY: ImportDiscovery = { sheets: [], ignored: [] };

function draft(
  id: string,
  kind: ImportEntityKind,
  values: EntityDraft["values"] = {},
  keys: EntityDraft["keys"] = [],
): EntityDraft {
  return {
    id,
    kind,
    values,
    sources: [{ table: "Лист1", index: 0, section: null }],
    keys,
    decision: decision("entity", 0.95, "тест", "rules"),
    review: [],
  };
}

function value(raw: string, confidence = 0.95) {
  return { raw, normalized: raw.trim(), decision: decision("field", confidence, "тест", "rules") };
}

function plan(entities: EntityDraft[], extra: Partial<Parameters<typeof buildImportPlan>[0]> = {}) {
  return buildImportPlan({
    importId: "imp1",
    companyId: "c1",
    entities,
    relationships: [],
    discovery: EMPTY_DISCOVERY,
    ...extra,
  });
}

describe("buildImportPlan", () => {
  it("plans a create for something the company does not have", () => {
    const result = plan([draft("e1", "donor", { vin: value(VIN_A) }, [{ field: "vin", value: VIN_A.toLowerCase() }])]);
    assert.equal(result.actions[0]!.verb, "create");
    assert.equal(result.summary.byKind.donor.create, 1);
  });

  it("plans an update when the VIN already exists", () => {
    const result = plan(
      [draft("e1", "donor", { vin: value(VIN_A) }, [{ field: "vin", value: VIN_A.toLowerCase() }])],
      { existing: { donorVins: new Map([[VIN_A.toLowerCase(), "donor-123"]]) } },
    );
    assert.equal(result.actions[0]!.verb, "update");
    assert.equal(result.actions[0]!.existingId, "donor-123");
  });

  it("sends a malformed VIN to review instead of creating a broken donor", () => {
    const result = plan([draft("e1", "donor", { vin: value("НЕ УКАЗАН") })]);
    assert.equal(result.actions[0]!.verb, "review");
    assert.equal(result.actions[0]!.review[0]?.code, "invalid-business-data");
  });

  it("refuses to write a price it is not sure about", () => {
    // "250" that might be a price, a quantity or an SKU must not become money.
    const result = plan([
      draft("e1", "usedPart", { price: value("250", FINANCIAL_REVIEW_THRESHOLD - 0.1) }),
    ]);
    assert.equal(result.actions[0]!.verb, "review");
    assert.equal(result.actions[0]!.review[0]?.code, "low-confidence-financial");
  });

  it("accepts a price it is sure about", () => {
    const result = plan([draft("e1", "usedPart", { price: value("250", 0.95) })]);
    assert.equal(result.actions[0]!.verb, "create");
  });

  it("sends an unrecognised row to review rather than guessing", () => {
    const result = plan([draft("e1", "unknown")]);
    assert.equal(result.actions[0]!.verb, "review");
    assert.equal(result.actions[0]!.review[0]?.code, "ambiguous-entity");
  });

  it("offers a possible duplicate instead of merging it", () => {
    const result = plan([draft("e1", "donor"), draft("e2", "donor")], {
      mergeCandidates: [{ entityIds: ["e1", "e2"], reason: "похожи", confidence: 0.55 }],
    });
    const merged = result.actions.find((action) => action.entityId === "e2")!;
    assert.equal(merged.verb, "review");
    assert.equal(merged.review[0]?.code, "destructive-merge");
    // The kept record is untouched and still planned normally.
    assert.equal(result.actions.find((action) => action.entityId === "e1")!.verb, "create");
  });

  it("names an entity it understood but cannot yet write", () => {
    const result = plan([draft("e1", "customer")]);
    assert.equal(result.actions[0]!.verb, "review");
    assert.deepEqual(result.summary.deferred, ["customer"]);
  });

  it("counts the rows discovery refused", () => {
    const result = plan([], {
      discovery: {
        sheets: [],
        ignored: [{ table: "A", index: 9, role: "total", reason: "Строка итогов" }],
      },
    });
    assert.equal(result.summary.ignoredRows, 1);
  });

  it("drops a relationship whose other end is not in the plan", () => {
    const result = buildImportPlan({
      importId: "imp1",
      companyId: "c1",
      entities: [draft("e1", "usedPart")],
      relationships: [
        {
          kind: "part-of-donor",
          fromId: "e1",
          toId: "missing",
          decision: decision("relationship", 0.9, "тест", "rules"),
        },
      ],
      discovery: EMPTY_DISCOVERY,
    });
    assert.deepEqual(result.relationships, []);
  });
});

describe("committableActions", () => {
  it("lets nothing needing review reach the database", () => {
    const result = plan([draft("e1", "unknown"), draft("e2", "donor")]);
    const committable = committableActions(result);
    assert.deepEqual(committable.map((action) => action.entityId), ["e2"]);
  });

  it("writes donors before the parts that point at them", () => {
    const result = plan([
      draft("e1", "usedPart"),
      draft("e2", "engine"),
      draft("e3", "donor"),
    ]);
    assert.deepEqual(
      committableActions(result).map((action) => action.kind),
      ["donor", "engine", "usedPart"],
    );
  });

  it("keeps an entity kind with no writer out of the commit", () => {
    const result = plan([draft("e1", "sale"), draft("e2", "donor")]);
    assert.deepEqual(committableActions(result).map((action) => action.kind), ["donor"]);
  });
});

describe("actionFingerprint", () => {
  it("is stable for the same record across runs of the same import", () => {
    const entity = draft("e1", "donor", {}, [{ field: "vin", value: VIN_A.toLowerCase() }]);
    const first = plan([entity]);
    const second = plan([{ ...entity, id: "e9" }]);
    assert.equal(
      actionFingerprint(first, first.actions[0]!),
      actionFingerprint(second, second.actions[0]!),
    );
  });

  it("differs between two records of the same kind", () => {
    const result = plan([
      draft("e1", "donor", {}, [{ field: "vin", value: "aaa" }]),
      draft("e2", "donor", {}, [{ field: "vin", value: "bbb" }]),
    ]);
    assert.notEqual(
      actionFingerprint(result, result.actions[0]!),
      actionFingerprint(result, result.actions[1]!),
    );
  });

  it("falls back to the source row when a record has no identity key", () => {
    const result = plan([draft("e1", "usedPart")]);
    assert.ok(actionFingerprint(result, result.actions[0]!).includes("Лист1#0"));
  });
});
