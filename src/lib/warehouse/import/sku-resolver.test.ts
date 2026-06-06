import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectImportFormatPreset } from "./format-presets.ts";
import { normalizeImportRow } from "./normalizer.ts";
import { disambiguateDuplicateSkus, resolveImportSku } from "./sku-resolver.ts";

const NOMENCLATURE_HEADERS = [
  "Идентификатор",
  "Наименование",
  "Оригинальный номер",
  "Штрихкод",
  "Номер производителя",
  "Код номенклатуры",
  "Приход",
  "Расход",
  "Производитель",
  "Единица измерения",
  "Цена прихода",
  "Цена: Цена продажи",
];

describe("sku resolver", () => {
  it("uses OEM number when catalog code is empty", () => {
    const preset = detectImportFormatPreset(NOMENCLATURE_HEADERS);
    assert.ok(preset);
    const row = {
      "Код номенклатуры": "",
      "Оригинальный номер": "10944AA070",
      "Номер производителя": "10944AA070",
      Наименование: "10944AA070",
      Идентификатор: "26387202",
    };
    assert.equal(resolveImportSku(row, preset.mapping as Record<string, string>, preset.enrichment), "10944AA070");
  });

  it("uses barcode when OEM is missing", () => {
    const preset = detectImportFormatPreset(NOMENCLATURE_HEADERS);
    assert.ok(preset);
    const row = {
      "Код номенклатуры": "",
      "Оригинальный номер": "",
      "Номер производителя": "3266720362539",
      Штрихкод: "3266720362539",
      Наименование: "10W60 5L BARDAHL",
      Идентификатор: "26033998",
    };
    assert.equal(resolveImportSku(row, preset.mapping as Record<string, string>, preset.enrichment), "3266720362539");
  });

  it("disambiguates duplicate SKUs inside one file", () => {
    const rows = disambiguateDuplicateSkus(
      [
        {
          rowIndex: 1,
          raw: { Идентификатор: "100" },
          normalized: { sku: "FILTER", name: "Filter A" },
        },
        {
          rowIndex: 2,
          raw: { Идентификатор: "200" },
          normalized: { sku: "FILTER", name: "Filter B" },
        },
      ],
      "Идентификатор",
    );
    assert.equal(rows[0].normalized.sku, "FILTER");
    assert.equal(rows[1].normalized.sku, "FILTER-200");
  });

  it("normalizes most nomenclature rows with sku", () => {
    const preset = detectImportFormatPreset(NOMENCLATURE_HEADERS);
    assert.ok(preset);
    const samples = [
      {
        "Код номенклатуры": "",
        "Оригинальный номер": "10944AA070",
        Наименование: "10944AA070",
        Производитель: "Subaru",
        Приход: "2",
        Расход: "1",
      },
      {
        "Код номенклатуры": "",
        "Оригинальный номер": "",
        Штрихкод: "3266720362539",
        "Номер производителя": "3266720362539",
        Наименование: "10W60 5L BARDAHL",
        Приход: "1",
        Расход: "1",
      },
      {
        "Код номенклатуры": "94621",
        "Оригинальный номер": "",
        Наименование: "ГРМ",
        Приход: "0",
        Расход: "0",
      },
    ];

    for (const raw of samples) {
      const normalized = normalizeImportRow(
        raw,
        preset.mapping as Record<string, string>,
        undefined,
        preset.enrichment,
      );
      assert.ok(String(normalized.sku ?? "").trim(), `expected sku for ${raw["Наименование"]}`);
    }
  });
});
