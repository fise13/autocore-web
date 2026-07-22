import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAiJsonContent,
  repairTruncatedJson,
} from "@/infrastructure/openrouter/parse-ai-json";

test("parseAiJsonContent strips markdown fences", () => {
  const value = parseAiJsonContent('```json\n{"engines":[{"serialCode":"A1"}]}\n```');
  assert.deepEqual(value, { engines: [{ serialCode: "A1" }] });
});

test("parseAiJsonContent ignores leading prose", () => {
  const value = parseAiJsonContent('Вот результат:\n{"engines":[]}');
  assert.deepEqual(value, { engines: [] });
});

test("parseAiJsonContent repairs truncated object", () => {
  const value = parseAiJsonContent('{"engines":[{"serialCode":"X","brandName":"BMW"');
  assert.equal(typeof value, "object");
  assert.ok(value && typeof value === "object" && "engines" in value);
});

test("repairTruncatedJson closes nested arrays", () => {
  const fixed = repairTruncatedJson('{"engines":[{"a":1},{"b":2');
  assert.doesNotThrow(() => JSON.parse(fixed));
});
