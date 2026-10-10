import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MotorEntity } from "@/domain/motor";
import { countStockByBrandEngine } from "@/lib/catalog-brand-counts";

const motor = (brandName: string, engineCode: string, extra: Partial<MotorEntity> = {}) =>
  ({ brandName, engineCode, ...extra }) as MotorEntity;

describe("countStockByBrandEngine", () => {
  it("counts only in-stock motors, grouped case-insensitively", () => {
    const stock = countStockByBrandEngine([
      motor("Subaru", "EJ251"),
      motor("subaru", "ej251"),
      motor("Subaru", "EJ253"),
      motor("Subaru", "EJ253", { soldDate: new Date() }),
      motor("Subaru", "EJ253", { status: "sold" }),
      motor("Subaru", "EJ204", { deletedAt: new Date() }),
      motor("Subaru", "—"),
      motor("", "EJ251"),
    ]);

    assert.deepEqual(stock.get("subaru"), [
      { code: "EJ251", count: 2 },
      { code: "EJ253", count: 1 },
    ]);
    assert.equal(stock.size, 1);
  });
});
