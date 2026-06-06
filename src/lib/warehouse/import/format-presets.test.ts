import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { suggestColumnMappingWithConfidence } from "./column-mapper.ts";
import { detectImportFormatPreset, isQuickImportReady } from "./format-presets.ts";
import { normalizeImportRow } from "./normalizer.ts";

const NOMENCLATURE_HEADERS = [
  "Идентификатор",
  "Наименование",
  "Наименование в чеке",
  "Группа",
  "Метка",
  "Примечание",
  "Единица измерения",
  "Категория",
  "Страна",
  "Производитель",
  "Приход",
  "Расход",
  "Минимальный остаток",
  "Оригинальный номер",
  "Штрихкод",
  "Номер производителя",
  "Код номенклатуры",
  "Цена прихода",
  "Максимальная скидка %",
  "Цена: Цена продажи",
];

describe("nomenclature import preset", () => {
  it("detects RU nomenclature export headers", () => {
    const match = detectImportFormatPreset(NOMENCLATURE_HEADERS);
    assert.ok(match);
    assert.equal(match.preset.id, "ru-nomenclature");
    assert.equal(match.mapping.sku, "Код номенклатуры");
    assert.equal(match.mapping.name, "Наименование");
    assert.equal(match.mapping.barcode, "Штрихкод");
    assert.ok(match.enrichment.skuFallbackHeaders?.includes("Оригинальный номер"));
  });

  it("maps columns without confusing barcode with sku", () => {
    const result = suggestColumnMappingWithConfidence(NOMENCLATURE_HEADERS);
    assert.equal(result.source, "preset");
    assert.equal(result.mapping.sku, "Код номенклатуры");
    assert.equal(result.mapping.barcode, "Штрихкод");
    assert.notEqual(result.mapping.sku, result.mapping.barcode);
  });

  it("computes net stock and barcode fallback from sample row", () => {
    const match = detectImportFormatPreset(NOMENCLATURE_HEADERS);
    assert.ok(match);
    const row = {
      "Код номенклатуры": "10944AA070",
      Наименование: "10944AA070",
      Производитель: "Subaru",
      Приход: "2",
      Расход: "1",
      "Оригинальный номер": "10944AA070",
      Штрихкод: "",
      "Единица измерения": "Штука",
      "Цена прихода": "18000",
      "Цена: Цена продажи": "18000",
    };
    const normalized = normalizeImportRow(
      row,
      match.mapping as Record<string, string>,
      undefined,
      match.enrichment,
    );
    assert.equal(normalized.sku, "10944AA070");
    assert.equal(normalized.quantity, 1);
    assert.deepEqual(normalized.barcodes, ["10944AA070"]);
    assert.equal(normalized.unit, "шт");
    assert.equal(normalized.purchasePrice, 18000);
  });

  it("keeps EAN barcode when present", () => {
    const match = detectImportFormatPreset(NOMENCLATURE_HEADERS);
    assert.ok(match);
    const row = {
      "Код номенклатуры": "3266720362539",
      Наименование: "10W60 5L BARDAHL",
      Производитель: "Bardhal",
      Приход: "1",
      Расход: "1",
      "Оригинальный номер": "3266720362539",
      Штрихкод: "3266720362539",
      "Единица измерения": "Штука",
      "Цена прихода": "25155",
      "Цена: Цена продажи": "31000",
    };
    const normalized = normalizeImportRow(
      row,
      match.mapping as Record<string, string>,
      undefined,
      match.enrichment,
    );
    assert.deepEqual(normalized.barcodes, ["3266720362539"]);
    assert.equal(normalized.quantity, 0);
    assert.equal(normalized.sellPrice, 31000);
  });

  it("marks quick import when all rows are valid", () => {
    assert.equal(
      isQuickImportReady(0.9, { total: 295, valid: 295, errors: 0 }),
      true,
    );
    assert.equal(
      isQuickImportReady(0.9, { total: 295, valid: 290, errors: 5 }),
      false,
    );
  });
});
