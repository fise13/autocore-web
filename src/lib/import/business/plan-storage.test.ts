import assert from "node:assert/strict";
import test from "node:test";

import {
  decodePlan,
  encodePlan,
  planChunkId,
  MAX_PLAN_CHUNK_CHARS,
  PLAN_FORMAT_GZIP_BASE64,
  PLAN_FORMAT_JSON,
} from "./plan-storage";

/**
 * These tests exist because of a real failure: a customer's spreadsheet
 * produced a plan larger than Firestore's 1,048,576-byte document ceiling and
 * the import died with `INVALID_ARGUMENT` after every expensive step had
 * already run. What matters is that no plan size can do that again, and that
 * what comes back out is byte-for-byte what went in.
 */

function bigPlan(entityCount: number) {
  return {
    importId: "imp-test",
    companyId: "acme",
    actions: Array.from({ length: entityCount }, (_, index) => ({
      entityId: `e${index}`,
      kind: "engine",
      verb: "create",
      decision: {
        kind: "entity",
        confidence: 0.92,
        reason: "Двигатель распознан по VIN и номеру, строка содержит цену и пробег",
        source: "rules",
      },
      review: [],
    })),
  };
}

test("a plan round-trips through encode and decode unchanged", () => {
  const plan = bigPlan(50);
  const chunks = encodePlan(plan);
  assert.deepEqual(JSON.parse(decodePlan(chunks, PLAN_FORMAT_GZIP_BASE64)), plan);
});

test("non-ASCII text survives the round trip", () => {
  const plan = { note: "МОТОР ЛЭНД — двигатель 1.9 TDI · 90 л.с. 🚗", nested: { emoji: "🔧" } };
  const chunks = encodePlan(plan);
  assert.deepEqual(JSON.parse(decodePlan(chunks, PLAN_FORMAT_GZIP_BASE64)), plan);
});

test("a small plan is one chunk", () => {
  assert.equal(encodePlan({ importId: "imp-1", actions: [] }).length, 1);
});

test("every chunk stays under Firestore's document ceiling", () => {
  const chunks = encodePlan(bigPlan(40_000));
  assert.ok(chunks.length > 0);
  for (const chunk of chunks) {
    assert.ok(
      Buffer.byteLength(chunk, "utf8") <= MAX_PLAN_CHUNK_CHARS,
      `chunk of ${Buffer.byteLength(chunk, "utf8")} bytes exceeds the chunk budget`,
    );
    assert.ok(Buffer.byteLength(chunk, "utf8") < 1_048_576);
  }
});

test("a plan far past the single-document limit still round-trips", () => {
  const plan = bigPlan(40_000);
  const raw = Buffer.byteLength(JSON.stringify(plan), "utf8");
  assert.ok(raw > 1_048_576, "fixture must exceed the single-document limit to be meaningful");

  const chunks = encodePlan(plan, 50_000);
  assert.ok(chunks.length > 1, "an oversized plan must split");
  assert.deepEqual(JSON.parse(decodePlan(chunks, PLAN_FORMAT_GZIP_BASE64)), plan);
});

test("legacy uncompressed plans are still readable", () => {
  const json = JSON.stringify({ importId: "imp-old", actions: [] });
  assert.equal(decodePlan([json], PLAN_FORMAT_JSON), json);
});

test("an empty chunk set is an error, not an empty plan", () => {
  assert.throws(() => decodePlan([], PLAN_FORMAT_GZIP_BASE64));
  assert.throws(() => decodePlan([""], PLAN_FORMAT_GZIP_BASE64));
});

test("a missing middle chunk fails loudly rather than decoding half a plan", () => {
  const chunks = encodePlan(bigPlan(2_000), 1_000);
  assert.ok(chunks.length > 2);
  assert.throws(() => decodePlan([chunks[0], ...chunks.slice(2)], PLAN_FORMAT_GZIP_BASE64));
});

test("chunk ids sort in sequence", () => {
  const ids = [0, 1, 2, 10, 100, 1_000].map(planChunkId);
  assert.deepEqual([...ids].sort(), ids);
  assert.equal(planChunkId(0), "chunk-00000");
});
