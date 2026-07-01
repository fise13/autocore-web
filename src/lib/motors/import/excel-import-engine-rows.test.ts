import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExcelSheetData } from "@/lib/motors/excel-types";
import { createAutoColumnMapping } from "@/lib/motors/excel-column-mapping";
import { createSheetImportConfig } from "@/lib/motors/excel-sheet-config";

import {
  buildEngineRowsFromSheet,
  extractSerialFromRow,
  inferSerialColumnIndex,
} from "../excel-import-engine-rows.ts";

describe("motor excel engine rows", () => {
  it("infers serial column from header hints", () => {
    const sheet: ExcelSheetData = {
      name: "EJ251",
      rows: [
        ["комплект", "дата"],
        ["EJ251-123456", "01.03.24"],
        ["EJ251-654321", "02.03.24"],
      ],
    };
    const mapping = createAutoColumnMapping(sheet.rows);
    const serialIndex = inferSerialColumnIndex(sheet, mapping);

    assert.equal(serialIndex, 0);
  });

  it("extracts serial from mislabeled configuration column", () => {
    const serial = extractSerialFromRow(["полный", "EJ22-032900", "АКПП"], {
      sheetName: "EJ22",
    });

    assert.equal(serial, "EJ22-032900");
  });

  it("builds engine rows for motor catalog sheet without serial header", () => {
    const sheet: ExcelSheetData = {
      name: "SUBARU",
      rows: [
        ["комплект", "дата", "кпп"],
        ["FB25-184521", "01.03.24", "АКПП"],
        ["FB25-184522", "02.03.24", "МКПП"],
      ],
    };
    const config = createSheetImportConfig("SUBARU", sheet.rows);
    const mapping = createAutoColumnMapping(sheet.rows);
    const rows = buildEngineRowsFromSheet(sheet, config, mapping);

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.serialCode, "FB25-184521");
    assert.equal(rows[0]?.brandName, "Subaru");
  });

  it("builds engine rows with empty serial for motor catalog when values are not serial-like", () => {
    const sheet: ExcelSheetData = {
      name: "EJ251",
      rows: [
        ["комплект", "дата"],
        ["полный комплект", "01.03.24"],
        ["без навесного", "02.03.24"],
      ],
    };
    const config = createSheetImportConfig("EJ251", sheet.rows);
    const mapping = createAutoColumnMapping(sheet.rows);
    const rows = buildEngineRowsFromSheet(sheet, config, mapping);

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.serialCode, "");
    assert.ok(rows[0]?.rawRowCells?.includes("полный комплект"));
  });

  it("does not build engine rows for generic non-motor sheets without serials", () => {
    const sheet: ExcelSheetData = {
      name: "Список запчастей",
      rows: [
        ["название", "цена"],
        ["деталь 1", "1000"],
      ],
    };
    const config = createSheetImportConfig("Список запчастей", sheet.rows);
    const mapping = createAutoColumnMapping(sheet.rows);
    const rows = buildEngineRowsFromSheet(sheet, config, mapping);

    assert.equal(rows.length, 0);
  });
});
