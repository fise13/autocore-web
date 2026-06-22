import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExcelSheetData } from "@/lib/motors/excel-types";

import { buildRuleSheetMapping } from "./sheet-mapper.ts";
import { finalizeSheetMappings } from "./sheet-recovery.ts";

describe("motor sheet recovery", () => {
  it("recovers skipped sheets as specific or engines instead of dropping them", () => {
    const sheet: ExcelSheetData = {
      name: "ПОСЛЕ ДЭНА",
      rows: [
        ["Модель", "Цена"],
        ["ABC", "10000"],
      ],
    };
    const base = buildRuleSheetMapping(sheet);
    const recovered = finalizeSheetMappings([sheet], { [base.config.id]: base })[base.config.id]!;

    assert.notEqual(recovered.config.importType, "skip");
    assert.equal(recovered.config.importType, "specific");
    assert.ok(recovered.config.categoryName.length > 0);
  });

  it("rebalances engine sheets without serial signal into specific catalogs", () => {
    const sheet: ExcelSheetData = {
      name: "Список запчастей",
      rows: [
        ["Название", "Кол-во"],
        ["Деталь 1", "2"],
      ],
    };
    const base = buildRuleSheetMapping(sheet);
    const recovered = finalizeSheetMappings([sheet], { [base.config.id]: base })[base.config.id]!;

    assert.equal(recovered.config.importType, "specific");
  });

  it("rebalances engine sheets with brand and engine but no serial into specific", () => {
    const sheet: ExcelSheetData = {
      name: "КПП TOYOTA",
      rows: [
        ["Модель", "Цена"],
        ["CVT", "45000"],
      ],
    };
    const base = buildRuleSheetMapping(sheet);
    const withEngines = {
      [base.config.id]: {
        ...base,
        config: {
          ...base.config,
          importType: "engines" as const,
          customBrand: "Toyota",
          customEngineCode: "CVT",
        },
      },
    };
    const recovered = finalizeSheetMappings([sheet], withEngines)[base.config.id]!;

    assert.equal(recovered.config.importType, "specific");
  });
});
