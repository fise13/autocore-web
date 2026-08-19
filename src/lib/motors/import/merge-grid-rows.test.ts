import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeMotorRowsBySerial, representedSheetConfigIds, serialMergeKey } from "./merge-grid-rows.ts";
import { MotorImportPreviewRow } from "./types.ts";

function row(overrides: Partial<MotorImportPreviewRow>): MotorImportPreviewRow {
  return {
    sheetName: "EJ 251",
    serialCode: "C090606",
    configuration: "",
    notes: "",
    quality: "",
    quantity: 1,
    transmission: "",
    warehouseLocation: "",
    arrivalDate: null,
    soldDate: null,
    brandName: "",
    engineCode: "",
    rowKey: "k1",
    rowIndex: 1,
    sheetConfigId: "cfg-stock",
    importType: "engines",
    action: "create",
    summary: "",
    confidence: 0.8,
    errors: [],
    warnings: [],
    selected: true,
    ...overrides,
  };
}

const JUNE = new Date(Date.UTC(2024, 5, 10, 12));
const DECEMBER = new Date(Date.UTC(2024, 11, 10, 12));

describe("merging an engine across sheets", () => {
  it("keeps the identity from the stock sheet and the event from the log", () => {
    const { rows, absorbed } = mergeMotorRowsBySerial([
      row({
        sheetName: "EJ 251",
        sheetConfigId: "cfg-stock",
        brandName: "Subaru",
        engineCode: "ej251",
        configuration: "ГУР",
        arrivalDate: JUNE,
      }),
      row({
        sheetName: "ПРОДАННЫЕ",
        sheetConfigId: "cfg-sold",
        rowKey: "k2",
        configuration: "ПОСЛЕ ДЭНА",
        notes: "SOLD",
        soldDate: DECEMBER,
      }),
    ]);

    assert.equal(absorbed, 1);
    assert.equal(rows.length, 1);

    const merged = rows[0];
    assert.equal(merged.brandName, "Subaru");
    assert.equal(merged.engineCode, "ej251");
    assert.equal(merged.configuration, "ГУР · ПОСЛЕ ДЭНА");
    assert.equal(merged.notes, "SOLD");
    assert.equal(merged.arrivalDate?.getTime(), JUNE.getTime());
    assert.equal(merged.soldDate?.getTime(), DECEMBER.getTime());
    assert.ok(merged.warnings.some((warning) => warning.includes("ПРОДАННЫЕ")));
  });

  it("takes the earliest arrival and the latest sale", () => {
    const { rows } = mergeMotorRowsBySerial([
      row({ arrivalDate: DECEMBER, soldDate: JUNE }),
      row({ rowKey: "k2", sheetConfigId: "cfg-b", arrivalDate: JUNE, soldDate: DECEMBER }),
    ]);

    assert.equal(rows[0].arrivalDate?.getTime(), JUNE.getTime());
    assert.equal(rows[0].soldDate?.getTime(), DECEMBER.getTime());
  });

  it("never merges rows that have no serial", () => {
    const { rows, absorbed } = mergeMotorRowsBySerial([
      row({ serialCode: "", rowKey: "a" }),
      row({ serialCode: "", rowKey: "b" }),
    ]);

    assert.equal(absorbed, 0);
    assert.equal(rows.length, 2);
  });

  it("matches serials written with different punctuation", () => {
    assert.equal(serialMergeKey("B-045 539"), serialMergeKey("B045539"));

    const { absorbed } = mergeMotorRowsBySerial([
      row({ serialCode: "B045539" }),
      row({ serialCode: "B-045 539", rowKey: "k2", sheetConfigId: "cfg-b" }),
    ]);
    assert.equal(absorbed, 1);
  });

  it("reports the sheets a merged row came from so none look empty", () => {
    const { rows } = mergeMotorRowsBySerial([
      row({ sheetConfigId: "cfg-stock" }),
      row({ rowKey: "k2", sheetConfigId: "cfg-sold", sheetName: "ПРОДАННЫЕ" }),
    ]);

    const represented = representedSheetConfigIds(rows);
    assert.equal(represented.has("cfg-stock"), true);
    assert.equal(represented.has("cfg-sold"), true);
  });

  it("takes the larger quantity, not the sum — it is one engine", () => {
    const { rows } = mergeMotorRowsBySerial([
      row({ quantity: 1 }),
      row({ rowKey: "k2", sheetConfigId: "cfg-b", quantity: 2 }),
    ]);
    assert.equal(rows[0].quantity, 2);
  });
});
