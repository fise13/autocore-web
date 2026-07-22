import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { KnowledgeEvent } from "@/domain/knowledge/types";
import { applyFactToPatterns } from "./learning-engine";
import { buildPatternId, buildScopedPatternId } from "./pattern-ids";

function baseEvent(overrides: Partial<KnowledgeEvent>): KnowledgeEvent {
  return {
    id: "evt-1",
    companyId: "company-1",
    type: "wo.completed",
    payload: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("applyFactToPatterns — wo.completed", () => {
  const event = baseEvent({
    type: "wo.completed",
    clientId: "client-1",
    mechanicId: "mech-1",
    engineCode: "EJ205",
    payload: {
      engineCode: "EJ205",
      partSkus: ["OIL-05W40", "FILTER-OIL"],
      partNames: { "OIL-05W40": "Масло 5W40", "FILTER-OIL": "Масляный фильтр" },
      laborTitles: ["Замена масла"],
      mechanicIds: ["mech-1"],
      fieldValues: { transmission: "Manual" },
    },
  });

  it("emits a kit op per part for the engine", () => {
    const ops = applyFactToPatterns(event);
    const kitOp = ops.find((op) => op.kind === "kit" && op.keys.includes("OIL-05W40"));
    assert.ok(kitOp, "expected a kit op for OIL-05W40");
    assert.equal(kitOp?.id, buildPatternId("kit", ["EJ205", "OIL-05W40"]));
    assert.equal(kitOp?.incrementSupport, 1);
    assert.equal(kitOp?.incrementTotal, 1);
  });

  it("emits a kit op for labor titles too", () => {
    const ops = applyFactToPatterns(event);
    const laborOp = ops.find((op) => op.kind === "kit" && op.label === "Замена масла");
    assert.ok(laborOp, "expected a kit op for the labor title");
  });

  it("emits a cooccur op for each unique part pair, sorted", () => {
    const ops = applyFactToPatterns(event);
    const cooccurOp = ops.find((op) => op.kind === "cooccur");
    assert.ok(cooccurOp);
    assert.deepEqual(cooccurOp?.keys, ["FILTER-OIL", "OIL-05W40"]);
  });

  it("emits client_prefs scoped to the client for engine and parts", () => {
    const ops = applyFactToPatterns(event);
    const clientEngineOp = ops.find(
      (op) => op.kind === "client_prefs" && op.keys[0] === "EJ205",
    );
    assert.ok(clientEngineOp);
    assert.equal(clientEngineOp?.scope, "client");
    assert.equal(clientEngineOp?.scopeId, "client-1");
    assert.equal(clientEngineOp?.id, buildScopedPatternId("client_prefs", "client", "client-1", ["EJ205"]));
  });

  it("emits mechanic-scoped ops per part for the engine", () => {
    const ops = applyFactToPatterns(event);
    const mechanicOp = ops.find(
      (op) => op.kind === "mechanic" && op.keys.includes("FILTER-OIL"),
    );
    assert.ok(mechanicOp);
    assert.equal(mechanicOp?.scope, "mechanic");
    assert.equal(mechanicOp?.scopeId, "mech-1");
  });

  it("emits a field op for bundled field values", () => {
    const ops = applyFactToPatterns(event);
    const fieldOp = ops.find((op) => op.kind === "field");
    assert.ok(fieldOp);
    assert.deepEqual(fieldOp?.keys, ["transmission", "Manual"]);
    assert.equal(fieldOp?.scope, "company");
  });
});

describe("applyFactToPatterns — field.committed", () => {
  it("scopes to the actor when payload.scope is personal", () => {
    const event = baseEvent({
      type: "field.committed",
      actorUserId: "user-1",
      payload: { fieldKey: "warrantyTemplate", fieldValue: "contract_engine", scope: "personal" },
    });
    const ops = applyFactToPatterns(event);
    assert.equal(ops.length, 1);
    assert.equal(ops[0].scope, "personal");
    assert.equal(ops[0].scopeId, "user-1");
  });

  it("defaults to company scope", () => {
    const event = baseEvent({
      type: "field.committed",
      payload: { fieldKey: "warrantyTemplate", fieldValue: "contract_engine" },
    });
    const ops = applyFactToPatterns(event);
    assert.equal(ops[0].scope, "company");
  });

  it("returns no ops when required fields are missing", () => {
    const event = baseEvent({ type: "field.committed", payload: { fieldKey: "x" } });
    assert.deepEqual(applyFactToPatterns(event), []);
  });
});

describe("applyFactToPatterns — suggestion feedback", () => {
  it("acceptance reinforces the referenced pattern as a success", () => {
    const event = baseEvent({
      type: "suggestion.accepted",
      payload: { suggestionId: "sugg-1", patternId: "kit::ej205__oil", kind: "kit" },
    });
    const ops = applyFactToPatterns(event);
    assert.equal(ops.length, 1);
    assert.equal(ops[0].id, "kit::ej205__oil");
    assert.equal(ops[0].incrementSupport, 1);
    assert.equal(ops[0].incrementTotal, 1);
  });

  it("rejection only grows the denominator", () => {
    const event = baseEvent({
      type: "suggestion.rejected",
      payload: { suggestionId: "sugg-1", patternId: "kit::ej205__oil", kind: "kit" },
    });
    const ops = applyFactToPatterns(event);
    assert.equal(ops[0].incrementSupport, 0);
    assert.equal(ops[0].incrementTotal, 1);
  });
});

describe("applyFactToPatterns — inventory.sold_together", () => {
  it("emits an fbt op for each sku pair", () => {
    const event = baseEvent({
      type: "inventory.sold_together",
      payload: { skus: ["BELT-A", "BELT-A", "PULLEY-B"] },
    });
    const ops = applyFactToPatterns(event);
    assert.equal(ops.length, 1);
    assert.deepEqual(ops[0].keys, ["BELT-A", "PULLEY-B"]);
    assert.equal(ops[0].kind, "fbt");
  });
});

describe("applyFactToPatterns — document.printed", () => {
  it("requires at least two doc types", () => {
    const event = baseEvent({ type: "document.printed", payload: { docTypes: ["work_order_pdf"] } });
    assert.deepEqual(applyFactToPatterns(event), []);
  });

  it("builds a docpack op scoped by engine when available", () => {
    const event = baseEvent({
      type: "document.printed",
      engineCode: "EJ205",
      payload: { docTypes: ["completion_act", "work_order_pdf"], engineCode: "EJ205" },
    });
    const ops = applyFactToPatterns(event);
    assert.equal(ops.length, 1);
    assert.deepEqual(ops[0].keys, ["EJ205", "completion_act", "work_order_pdf"]);
  });
});

describe("applyFactToPatterns — wo.created", () => {
  it("is a no-op in E0–E1", () => {
    const event = baseEvent({ type: "wo.created" });
    assert.deepEqual(applyFactToPatterns(event), []);
  });
});
