import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateImportRow } from "./validation.ts";
import { EnhancedImportRow } from "./types.ts";

function baseRow(overrides: Partial<EnhancedImportRow> = {}): EnhancedImportRow {
  return {
    rowIndex: 1,
    raw: { sku: "A1", name: "Oil" },
    normalized: { sku: "A1", name: "Oil", quantity: 2, purchasePrice: 100, sellPrice: 80 },
    confidence: 0.9,
    errors: [],
    selected: true,
    action: "create",
    summary: "create",
    ...overrides,
  };
}

describe("import validation", () => {
  it("warns when sell price is below purchase price", () => {
    const row = validateImportRow(baseRow());
    assert.ok(row.aiMeta?.warnings.some((warning: string) => warning.includes("продажи")));
  });

  it("rejects negative quantity", () => {
    const row = validateImportRow(
      baseRow({
        normalized: { sku: "A1", name: "Oil", quantity: -1 },
      }),
    );
    assert.ok(row.errors.some((error: string) => error.includes("отрицательным")));
    assert.equal(row.selected, false);
  });
});
