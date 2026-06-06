import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeImportRowForFirestore } from "./firestore-sanitize.ts";
import { InventoryImportRow } from "@/domain/inventory-import";

describe("firestore sanitize", () => {
  it("removes undefined nested fields from import rows", () => {
    const row: InventoryImportRow = {
      rowIndex: 1,
      raw: { sku: "A1" },
      normalized: {
        sku: "A1",
        name: "Oil",
        categoryPath: undefined,
        quantity: 1,
      },
      confidence: 0.9,
      errors: [],
      selected: true,
    };

    const sanitized = sanitizeImportRowForFirestore(row);
    assert.equal("categoryPath" in sanitized.normalized, false);
    assert.equal(sanitized.normalized.sku, "A1");
  });
});
