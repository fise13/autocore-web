import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExcelSheetData } from "@/lib/motors/excel-types";

import {
  aiColumnRolesToMapping,
  buildRuleSheetMapping,
  mergeAiSheetMapping,
  needsAiSheetMapping,
} from "./sheet-mapper.ts";
import { mappingHasSerialColumn } from "@/lib/motors/excel-import-engine-rows";

function mappingHasSerialFromMapping(mapping: ReturnType<typeof buildRuleSheetMapping>) {
  return mappingHasSerialColumn(mapping.columnMapping);
}

function makeEngineSheet(name = "Toyota 2AZ-FE"): ExcelSheetData {
  return {
    name,
    rows: [
      ["№", "Комплектация", "Дата прихода"],
      ["ABC123", "2WD", "01.01.2024"],
      ["DEF456", "4WD", "02.01.2024"],
    ],
  };
}

describe("motor sheet mapper", () => {
  it("builds high-confidence rule mapping for engine sheets with serial column", () => {
    const mapping = buildRuleSheetMapping(makeEngineSheet());
    assert.equal(mapping.config.importType, "engines");
    assert.ok(mapping.confidence >= 0.6);
    assert.equal(mapping.source, "rules");
    assert.ok(mappingHasSerialFromMapping(mapping));
  });

  it("detects sold sheets by name", () => {
    const mapping = buildRuleSheetMapping(makeEngineSheet("Проданные Toyota 2AZ"));
    assert.equal(mapping.detectedSoldSheet, true);
  });

  it("flags low confidence when serial column is missing", () => {
    const sheet: ExcelSheetData = {
      name: "Toyota 2AZ-FE",
      rows: [
        ["Комплектация", "Примечание"],
        ["2WD", "test"],
      ],
    };
    const mapping = buildRuleSheetMapping(sheet);
    assert.equal(mapping.config.importType, "engines");
    assert.ok(mapping.warnings.some((warning) => warning.includes("серийник")));
    assert.ok(needsAiSheetMapping([mapping]));
  });

  it("converts AI column roles into sheet column mapping", () => {
    const sheet = makeEngineSheet();
    const base = buildRuleSheetMapping(sheet);
    const aiMapping = aiColumnRolesToMapping(sheet, {
      sheet_name: sheet.name,
      import_type: "engines",
      brand_name: "Toyota",
      engine_code: "2AZ-FE",
      column_roles: { "0": "serial_code", "1": "configuration", "2": "arrival_date" },
      confidence: 0.91,
      detected_sold_sheet: false,
      fallback_date_columns: [],
    }, base.columnMapping);

    const serial = aiMapping.columnMappings.find((item) => item.engineFieldMapping === "serialCode");
    assert.ok(serial);
    assert.equal(serial?.columnIndex, 0);
  });

  it("merges AI sheet metadata into rule mapping", () => {
    const sheet = makeEngineSheet();
    const base = buildRuleSheetMapping(sheet);
    const merged = mergeAiSheetMapping(
      base,
      sheet,
      {
        sheet_name: sheet.name,
        import_type: "engines",
        brand_name: "Toyota",
        engine_code: "2AZ-FE",
        column_roles: { "0": "serial_code" },
        confidence: 0.88,
        detected_sold_sheet: true,
        fallback_date_columns: [2],
      },
      "AI определил лист двигателей",
    );

    assert.equal(merged.source, "ai");
    assert.equal(merged.config.customBrand, "Toyota");
    assert.equal(merged.config.customEngineCode, "2AZ-FE");
    assert.equal(merged.detectedSoldSheet, true);
    assert.equal(merged.reasoning, "AI определил лист двигателей");
  });
});
