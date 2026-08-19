import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExcelSheetData } from "@/lib/motors/excel-types";

import { runMotorImportPreviewPipeline } from "./pipeline.ts";
import { MotorImportPreviewRow } from "./types.ts";

/**
 * End-to-end cover for the shape of a real dismantler workbook.
 *
 * Every quirk below was found in a production file that imported badly: a title row above
 * the header, engine family and serial glued into one cell, section headings mid-sheet,
 * multi-family tabs, "N/A" and "???" filler, movement logs that repeat engines already
 * listed on their family tab, and a sold archive with an unreadable date.
 *
 * The serials are invented; only the structure is real.
 */

const MOTOR_HEADER = [
  "НОМЕР ДВИГАТЕЛЯ",
  "КОМПЛЕКТАЦИЯ",
  "ОСОБЫЕ ОТМЕТКИ",
  "КОЛ-ВО",
  "КОРОБКА",
  "ДАТА ПРИХОДА",
  "ДАТА ПРОДАЖИ",
];

function workbook(): ExcelSheetData[] {
  return [
    {
      name: "EJ 251",
      rows: [
        ["SUBARU-EJ251"],
        MOTOR_HEADER,
        ["C111111", "ГУР, ГЕНЕРАТОР", "", "1", "N/A", "6/10/24", ""],
        ["C222222", "ГУР", "СВЕРДЛОВА 15.10.2024", "1", "N/A", "6/10/24", ""],
        ["C333333", "ГУР", "SOLD", "1", "N/A", "6/10/24", "12/10/24"],
      ],
    },
    {
      name: "201-204-205",
      rows: [
        ["SUBARU-204"],
        MOTOR_HEADER,
        ["B444444", "", "", "", "N/A", "6/10/24", ""],
        ["EJ-254 C555555", "", "SOLD", "", "N/A", "6/10/24", "5/11/26"],
        ["N/A"],
      ],
    },
    {
      name: "NISSAN-INFINITI",
      rows: [
        ["NISSAN/INFINITI"],
        MOTOR_HEADER,
        ["VQ40"],
        ["VQ40- 666666A", "S KOROBKOY", "", "", "", "", ""],
        ["VQ40- ???", "", "", "", "", "", ""],
        ["VQ35"],
        ["VQ35- 777777B", "", "", "", "", "3/13/25", ""],
      ],
    },
    {
      name: "MIX",
      rows: [
        ["MIX"],
        MOTOR_HEADER,
        ["RENAULT"],
        ["K4M- A752- D888888", "", "SOLD", "", "", "", "1/27/26"],
        ["FORD"],
        ["F16D3- 999999", "", "", "", "", "", ""],
      ],
    },
    {
      name: "ПОСЛЕ ДЭНА",
      rows: [
        ["ТОРГОВЫЙ СКЛАД"],
        MOTOR_HEADER,
        ["МОТОРЫ ПОСЛЕ ДЭНА"],
        ["EJ251- C222222", "", "ПРОДАН", "", "", "8/30/24", "28.09.20245"],
      ],
    },
    {
      name: "ПРОДАННЫЕ",
      rows: [
        ["ПРОДАННЫЕ"],
        ["МАРКА", "НОМЕР ДВИГАТЕЛЯ", "ДАТА ПРОДАЖИ", "ОСОБЫЕ ОТМЕТКИ"],
        ["SUBARU", "EJ251- C333333", "12/10/24", "ПОСЛЕ ДЭНА"],
        ["SUBARU", "253AVCS- L123456", "???", ""],
        ["CRUZE", "F18D4- 041610KA", "11/4/25", "SOLD"],
      ],
    },
    {
      name: "КОРОБКИ",
      rows: [["КОРОБКИ"], ["НОМЕР", "ДАТА"], ["TZ1A4ZFEAA-3M", "6/10/24"]],
    },
  ];
}

async function preview() {
  return runMotorImportPreviewPipeline({
    companyId: "test",
    sheets: workbook(),
    existingMotors: [],
    existingBrands: [],
    existingEngines: [],
    existingSpecificCategories: [],
    useAi: false,
    magicImport: false,
  });
}

function bySerial(rows: MotorImportPreviewRow[], serial: string): MotorImportPreviewRow {
  const row = rows.find((item) => item.serialCode === serial);
  assert.ok(row, `no row for serial ${serial}`);
  return row;
}

describe("dismantler workbook import", () => {
  it("splits family and serial into their own grid columns", async () => {
    const { engineRows } = await preview();
    const row = bySerial(engineRows, "666666A");

    assert.equal(row.brandName, "Nissan");
    assert.equal(row.engineCode, "vq40");
    assert.equal(row.serialCode, "666666A");
  });

  it("reads brand and engine from the title row when the tab name cannot", async () => {
    const { engineRows } = await preview();
    const row = bySerial(engineRows, "B444444");

    assert.equal(row.brandName, "Subaru");
    assert.equal(row.engineCode, "ej204");
  });

  it("lets a row's own prefix override the sheet's engine", async () => {
    const { engineRows } = await preview();
    assert.equal(bySerial(engineRows, "C555555").engineCode, "ej254");
  });

  it("uses section headings as context and never as motors", async () => {
    const { engineRows } = await preview();

    for (const heading of ["VQ40", "VQ35", "RENAULT", "FORD", "МОТОРЫ ПОСЛЕ ДЭНА", "N/A"]) {
      assert.equal(
        engineRows.some((row) => row.serialCode === heading),
        false,
        `${heading} was imported as a motor`,
      );
    }

    assert.equal(bySerial(engineRows, "777777B").engineCode, "vq35");
    assert.equal(bySerial(engineRows, "D888888").brandName, "Renault");
    assert.equal(bySerial(engineRows, "999999").brandName, "Ford");
  });

  it("puts operational qualifiers in configuration, not in notes or location", async () => {
    const { engineRows } = await preview();
    const row = bySerial(engineRows, "C222222");

    assert.ok(row.configuration.includes("СВЕРДЛОВА"), row.configuration);
    assert.ok(row.configuration.includes("ПОСЛЕ ДЭНА"), row.configuration);
    assert.ok(row.configuration.includes("ГУР"), row.configuration);
  });

  it("merges an engine that appears on several sheets into one row", async () => {
    const { engineRows, stats } = await preview();

    assert.ok((stats.mergedRows ?? 0) >= 2, `expected merges, got ${stats.mergedRows}`);
    assert.equal(engineRows.filter((row) => row.serialCode === "C222222").length, 1);

    const sold = bySerial(engineRows, "C333333");
    assert.equal(sold.soldDate?.toISOString().slice(0, 10), "2024-12-10");
    assert.ok(sold.mergedFrom?.some((entry) => entry.sheetName === "ПРОДАННЫЕ"));
  });

  it("keeps dates on the day the spreadsheet wrote them", async () => {
    const { engineRows } = await preview();
    assert.equal(bySerial(engineRows, "C111111").arrivalDate?.toISOString().slice(0, 10), "2024-06-10");
  });

  it("never invents a sold date for an unreadable one", async () => {
    const { engineRows } = await preview();

    const unreadable = bySerial(engineRows, "L123456");
    assert.equal(unreadable.soldDate ?? null, null);
    assert.ok(unreadable.rowWarnings?.some((warning) => /дата продажи/i.test(warning)));

    const brokenYear = bySerial(engineRows, "C222222");
    assert.equal(brokenYear.soldDate ?? null, null);
  });

  it("expands a bare Subaru family number", async () => {
    const { engineRows } = await preview();
    assert.equal(bySerial(engineRows, "L123456").engineCode, "ej253avcs");
  });

  it("resolves a model name in the brand column to its manufacturer", async () => {
    const { engineRows } = await preview();
    assert.equal(bySerial(engineRows, "041610KA").brandName, "Chevrolet");
  });

  it("empties placeholder cells instead of importing them", async () => {
    const { engineRows } = await preview();

    for (const row of engineRows) {
      assert.notEqual(row.transmission, "N/A", row.serialCode);
      assert.notEqual(row.configuration, "N/A", row.serialCode);
      assert.notEqual(row.serialCode, "???", row.serialCode);
    }

    const placeholderSerial = engineRows.find((row) =>
      row.rowWarnings?.some((warning) => /заполнител/i.test(warning)),
    );
    assert.ok(placeholderSerial, "the ??? serial row should survive with a warning");
    assert.equal(placeholderSerial.engineCode, "vq40");
  });

  it("classifies movement logs as engines and parts tabs as catalogs", async () => {
    const { sheetMappings, specificSheets } = await preview();
    const byName = Object.fromEntries(
      Object.values(sheetMappings).map((mapping) => [mapping.config.sheetName, mapping.config.importType]),
    );

    assert.equal(byName["ПОСЛЕ ДЭНА"], "engines");
    assert.equal(byName["ПРОДАННЫЕ"], "engines");
    assert.equal(byName["MIX"], "engines");
    assert.equal(byName["КОРОБКИ"], "specific");
    assert.deepEqual(
      specificSheets.map((sheet) => sheet.sheetName),
      ["КОРОБКИ"],
    );
  });

  it("keeps every source row that carries data", async () => {
    const { engineRows } = await preview();
    // 14 engine data rows (section headings and the "N/A" row are not data), minus the two
    // repeat appearances folded by the serial merge.
    assert.equal(engineRows.length, 12);
  });
});
