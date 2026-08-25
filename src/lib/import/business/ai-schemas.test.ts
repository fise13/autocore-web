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

test("something that is not a confidence at all is refused", () => {
  // Dropped rather than thrown: the entry never reaches the plan either way,
  // and the rows either side of it keep their answers.
  const parsed = aiDiscoveryResponseSchema.parse({
    rowRoles: [
      { rowId: "r1", role: "record", confidence: "очень уверен", reason: "" },
      { rowId: "r2", role: "record", confidence: 900, reason: "" },
      { rowId: "r3", role: "record", confidence: 0.9, reason: "" },
    ],
  });
  assert.deepEqual(parsed.rowRoles.map((role) => role.rowId), ["r3"]);
});

test("shape tolerance does not extend to invented values", () => {
  // An invented relationship kind or row role is dropped, never accepted —
  // the entry cannot reach the plan either way, and its neighbours survive.
  const links = aiRelationshipResponseSchema.parse({
    links: [
      { kind: "owns-the-company", fromId: "e1", toId: "e2", confidence: 1, reason: "" },
      { kind: "part-of-donor", fromId: "e3", toId: "e4", confidence: 0.9, reason: "VIN" },
    ],
  }).links;
  assert.deepEqual(links.map((link) => link.kind), ["part-of-donor"]);

  const roles = aiDiscoveryResponseSchema.parse({
    rowRoles: [
      { rowId: "r1", role: "delete-everything", confidence: 1, reason: "" },
      { rowId: "r2", role: "total", confidence: 0.9, reason: "ИТОГО" },
    ],
  }).rowRoles;
  assert.deepEqual(roles.map((role) => role.rowId), ["r2"]);
});

test("prose that is not a string is still read as prose", () => {
  // The failure a customer actually saw: rowRoles[0].reason was not a string
  // and the whole discovery pass was thrown away.
  const parsed = aiDiscoveryResponseSchema.parse({
    sheetSummary: ["Лист двигателей", "и склад"],
    rowRoles: [
      { rowId: "r1", role: "record", confidence: 0.9, reason: null },
      { rowId: "r2", role: "total", confidence: 0.9, reason: 42 },
      { rowId: "r3", role: "note", confidence: 0.9, reason: { text: "заметка" } },
      { rowId: "r4", role: "record", confidence: 0.9, reason: ["один", "два"] },
    ],
  });

  assert.equal(parsed.rowRoles.length, 4);
  assert.equal(parsed.rowRoles[0]!.reason, "");
  assert.equal(parsed.rowRoles[1]!.reason, "42");
  assert.ok(parsed.rowRoles[2]!.reason.includes("заметка"));
  assert.equal(parsed.rowRoles[3]!.reason, "один; два");
  assert.equal(parsed.sheetSummary, "Лист двигателей; и склад");
});

test("over-long prose is cut, not refused", () => {
  const parsed = aiDiscoveryResponseSchema.parse({
    rowRoles: [{ rowId: "r1", role: "record", confidence: 0.9, reason: "я".repeat(900) }],
  });
  assert.equal(parsed.rowRoles[0]!.reason.length, 400);
});

test("an id written as a number still identifies its row", () => {
  const parsed = aiOntologyResponseSchema.parse({
    rows: [{ rowId: 12, kind: "engine", confidence: 0.9, reason: "ok" }],
  });
  assert.equal(parsed.rows[0]!.rowId, "12");
});

test("an answer that cannot be attributed to a row is dropped", () => {
  const parsed = aiOntologyResponseSchema.parse({
    rows: [
      { rowId: "", kind: "engine", confidence: 0.9, reason: "no id" },
      { kind: "engine", confidence: 0.9, reason: "no id at all" },
      { rowId: "Лист1#5", kind: "engine", confidence: 0.9, reason: "fine" },
    ],
  });
  assert.deepEqual(parsed.rows.map((row) => row.rowId), ["Лист1#5"]);
});

test("one bad entry does not take the good ones with it", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    rowId: `Лист1#${index}`,
    kind: index === 3 ? "spaceship" : "engine",
    confidence: 0.9,
    reason: "ok",
  }));
  const parsed = aiOntologyResponseSchema.parse({ rows });
  assert.equal(parsed.rows.length, 11);
  assert.ok(!parsed.rows.some((row) => row.rowId === "Лист1#3"));
});
