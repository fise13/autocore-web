import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExcelSheetData } from "@/lib/motors/excel-types";

import { applyAiSheetToConfig, aiColumnRolesToMapping } from "./sheet-mapper.ts";
import { createSheetImportConfig } from "@/lib/motors/excel-sheet-config";
import { createSheetColumnMapping } from "@/lib/motors/excel-import-engine-rows";

describe("motor ai mapper", () => {
  it("maps macOS-style column_roles indices to engine fields", () => {
    const sheet: ExcelSheetData = {
      name: "Toyota 2AZ",
      rows: [
        ["Serial", "Config", "Notes", "Sold"],
        ["S1", "2WD", "ok", "01.02.2024"],
      ],
    };
    const config = createSheetImportConfig(sheet.name, sheet.rows);
    const baseMapping = createSheetColumnMapping(sheet, config.importType);

    const mapping = aiColumnRolesToMapping(
      sheet,
      {
        sheet_name: sheet.name,
        import_type: "engines",
        brand_name: "Toyota",
        engine_code: "2AZ-FE",
        column_roles: {
          "0": "serial_code",
          "1": "configuration",
          "2": "notes",
          "3": "sold_date",
        },
        confidence: 0.95,
        detected_sold_sheet: false,
        fallback_date_columns: [3],
      },
      baseMapping,
    );

    const roles = Object.fromEntries(
      mapping.columnMappings
        .filter((item) => item.engineFieldMapping)
        .map((item) => [item.columnIndex, item.engineFieldMapping]),
    );

    assert.deepEqual(roles, {
      0: "serialCode",
      1: "configuration",
      2: "notes",
      3: "soldDate",
    });
  });

  it("applies AI import_type and catalog hints to sheet config", () => {
    const config = createSheetImportConfig("Misc", [["Serial"], ["A1"]]);
    const next = applyAiSheetToConfig(config, {
      sheet_name: "Misc",
      import_type: "specific",
      brand_name: null,
      engine_code: null,
      category_name: "Коробки",
      column_roles: { "0": "serial_code" },
      confidence: 0.8,
      detected_sold_sheet: false,
      fallback_date_columns: [],
    });

    assert.equal(next.importType, "specific");
    assert.equal(next.categoryName, "КПП");
  });
});
