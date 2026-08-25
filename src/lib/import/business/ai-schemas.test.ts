import assert from "node:assert/strict";
import test from "node:test";

import {
  aiDiscoveryResponseSchema,
  aiNormalizationResponseSchema,
  aiOntologyResponseSchema,
  aiRelationshipResponseSchema,
} from "./ai-schemas";

/**
 * A model answering the right thing in the wrong shape used to cost the whole
 * pass. Gemini returned discovery's `rowRoles` as a map keyed by rowId instead
 * of an array; the schema rejected it, the guard swallowed it, and the import
 * told the person AI analysis was unavailable — with the analysis sitting
 * right there in the response.
 */

test("a list answered as a map keyed by id is accepted", () => {
  const parsed = aiDiscoveryResponseSchema.parse({
    sheetSummary: "Список двигателей",
    rowRoles: {
      "Лист1#1": { role: "record", confidence: 0.95, reason: "engine" },
      "Лист1#3": { role: "total", confidence: 0.9, reason: "ИТОГО" },
    },
  });

  assert.deepEqual(
    parsed.rowRoles.map((entry) => [entry.rowId, entry.role]),
    [
      ["Лист1#1", "record"],
      ["Лист1#3", "total"],
    ],
  );
});

test("an id already present in the entry wins over the key", () => {
  const parsed = aiOntologyResponseSchema.parse({
    rows: {
      "0": { rowId: "Лист1#7", kind: "engine", confidence: 0.9, reason: "ok" },
    },
  });
  assert.equal(parsed.rows[0]!.rowId, "Лист1#7");
});

test("nested lists take the same treatment", () => {
  const parsed = aiOntologyResponseSchema.parse({
    rows: [
      {
        rowId: "Лист1#1",
        kind: "engine",
        confidence: 0.9,
        reason: "ok",
        fields: { serial: { value: "EJ251-442063", confidence: 0.95 } },
      },
    ],
  });
  assert.deepEqual(parsed.rows[0]!.fields, [
    { field: "serial", value: "EJ251-442063", confidence: 0.95 },
  ]);
});

test("arrays still parse as arrays", () => {
  const parsed = aiNormalizationResponseSchema.parse({
    values: [{ valueId: "v1", normalized: "Toyota", confidence: 0.9, reason: "ok" }],
  });
  assert.equal(parsed.values[0]!.normalized, "Toyota");
});

test("a missing list is an empty list, not a failure", () => {
  assert.deepEqual(aiRelationshipResponseSchema.parse({}).links, []);
  assert.deepEqual(aiDiscoveryResponseSchema.parse({}).rowRoles, []);
});

test("a confidence written as text or a percentage still means what it says", () => {
  const parsed = aiDiscoveryResponseSchema.parse({
    rowRoles: [
      { rowId: "r1", role: "record", confidence: "0.9", reason: "ok" },
      { rowId: "r2", role: "total", confidence: 95, reason: "ok" },
      { rowId: "r3", role: "note", confidence: "0,8", reason: "ok" },
    ],
  });
  assert.deepEqual(
    parsed.rowRoles.map((entry) => entry.confidence),
    [0.9, 0.95, 0.8],
  );
});

test("something that is not a confidence at all is still refused", () => {
  assert.throws(() =>
    aiDiscoveryResponseSchema.parse({
      rowRoles: [{ rowId: "r1", role: "record", confidence: "очень уверен", reason: "" }],
    }),
  );
  assert.throws(() =>
    aiDiscoveryResponseSchema.parse({
      rowRoles: [{ rowId: "r1", role: "record", confidence: 900, reason: "" }],
    }),
  );
});

test("shape tolerance does not extend to invented values", () => {
  assert.throws(() =>
    aiRelationshipResponseSchema.parse({
      links: [{ kind: "owns-the-company", fromId: "e1", toId: "e2", confidence: 1, reason: "" }],
    }),
  );
  assert.throws(() =>
    aiDiscoveryResponseSchema.parse({
      rowRoles: [{ rowId: "r1", role: "delete-everything", confidence: 1, reason: "" }],
    }),
  );
});
