import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareMagicImportRow,
  prepareMagicImportRowsForCommit,
} from "./import-row-integrity";
import { MotorImportPreviewRow } from "./types";

function baseRow(overrides: Partial<MotorImportPreviewRow> = {}): MotorImportPreviewRow {
  return {
    sheetName: "EJ251",
    serialCode: "",
    configuration: "полный",
    notes: "",
    quantity: 1,
    transmission: "",
    arrivalDate: null,
    soldDate: null,
    brandName: "Subaru",
    engineCode: "ej251",
    rowKey: "cfg:row-1:1",
    rowIndex: 1,
    sheetConfigId: "cfg",
    importType: "engines",
    action: "skip",
    summary: "",
    confidence: 0.8,
    errors: ["Серийник обязателен"],
    warnings: [],
    selected: false,
    ...overrides,
  };
}

test("prepareMagicImportRow keeps meaningful rows selected without blocking serial error", () => {
  const prepared = prepareMagicImportRow(baseRow());
  assert.equal(prepared.selected, true);
  assert.equal(prepared.errors.length, 0);
  assert.equal(prepared.action, "create");
  assert.ok(prepared.serialCode.startsWith("AUTO-"));
  assert.ok(prepared.warnings.some((item) => item.includes("Серийник")));
});

test("prepareMagicImportRowsForCommit preserves row count for meaningful rows", () => {
  const rows = [
    baseRow({ rowKey: "a", rowIndex: 1 }),
    baseRow({ rowKey: "b", rowIndex: 2, serialCode: "EJ22-001" }),
    baseRow({ rowKey: "c", rowIndex: 3, configuration: "", notes: "", brandName: "", engineCode: "" }),
  ];
  const prepared = prepareMagicImportRowsForCommit(rows);
  assert.equal(prepared.filter((row) => row.selected).length, 2);
});
