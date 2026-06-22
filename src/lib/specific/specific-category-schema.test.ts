import assert from "node:assert/strict";
import test from "node:test";

import { SpecificColumnDef } from "@/domain/specific-category";
import {
  createDefaultColumnSchema,
  diffColumnSchemas,
  normalizeColumnSchema,
  slugifyColumnKey,
} from "@/lib/specific/specific-category-schema";

test("createDefaultColumnSchema returns seven canonical columns", () => {
  const schema = createDefaultColumnSchema();
  assert.equal(schema.length, 7);
  assert.equal(schema.filter((column) => column.kind === "canonical").length, 7);
  assert.equal(schema[6]?.editable, false);
});

test("normalizeColumnSchema fills missing canonical slots", () => {
  const partial: SpecificColumnDef[] = [
    {
      id: "a",
      key: "serial",
      title: "Серийник",
      kind: "canonical",
      slotIndex: 0,
    },
  ];
  const normalized = normalizeColumnSchema(partial);
  assert.equal(normalized.length, 7);
  assert.equal(normalized[0]?.key, "serial");
});

test("diffColumnSchemas detects rename and removal", () => {
  const previous = createDefaultColumnSchema();
  const next = previous.map((column, index) =>
    index === 0 ? { ...column, key: "engine_no", title: "Номер" } : column,
  );
  next.push({
    id: "custom-1",
    key: "vendor",
    title: "Поставщик",
    kind: "custom",
    editable: true,
  });

  const diff = diffColumnSchemas(previous, next);
  assert.equal(diff.renamed.length, 1);
  assert.equal(diff.renamed[0]?.oldKey, previous[0]?.key);
  assert.equal(diff.renamed[0]?.newKey, "engine_no");
  assert.equal(diff.added.includes("vendor"), true);
});

test("slugifyColumnKey deduplicates keys", () => {
  const keys = ["коробка", "коробка_2"];
  assert.equal(slugifyColumnKey("Коробка", keys), "коробка_3");
});
