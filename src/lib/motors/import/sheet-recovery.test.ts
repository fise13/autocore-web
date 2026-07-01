import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExcelSheetData } from "@/lib/motors/excel-types";

import { buildRuleSheetMapping } from "./sheet-mapper.ts";
import { finalizeSheetMappings, rebalanceEmptyEngineSheets } from "./sheet-recovery.ts";
import { buildEngineRowsFromSheet } from "../excel-import-engine-rows.ts";
import { createSheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { createAutoColumnMapping } from "@/lib/motors/excel-column-mapping";

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

  it("keeps motor catalog sheets as engines when serial column is missing", () => {
    const sheet: ExcelSheetData = {
      name: "SUBARU",
      rows: [
        ["комплект", "дата"],
        ["полный", "01.03.24"],
      ],
    };
    const base = buildRuleSheetMapping(sheet);
    const recovered = finalizeSheetMappings([sheet], { [base.config.id]: base })[base.config.id]!;

    assert.equal(recovered.config.importType, "engines");
    assert.ok(
      recovered.warnings.some((warning) => /серийник|автономер/i.test(warning)),
    );
  });

  it("does not rebalance empty motor catalog engine sheets into specific", () => {
    const sheet: ExcelSheetData = {
      name: "EJ251",
      rows: [
        ["комплект", "дата"],
        ["полный", "01.03.24"],
      ],
    };
    const base = buildRuleSheetMapping(sheet);
    const config = createSheetImportConfig("EJ251", sheet.rows);
    const mapping = createAutoColumnMapping(sheet.rows);
    const engineRows = buildEngineRowsFromSheet(sheet, config, mapping).map((row, index) => ({
      sheetConfigId: base.config.id,
      rowKey: `row-${index}`,
    }));

    const rebalanced = rebalanceEmptyEngineSheets(
      [sheet],
      { [base.config.id]: { ...base, config: { ...base.config, importType: "engines" } } },
      engineRows,
    )[base.config.id]!;

    assert.equal(rebalanced.config.importType, "engines");
  });
});
