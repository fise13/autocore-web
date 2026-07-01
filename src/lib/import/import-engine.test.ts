import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeTable,
  classifyRecord,
  detectColumns,
  detectCurrency,
  explainRow,
  isVin,
  looksLikePrice,
  parseNumericValue,
  parseYear,
  suggestRecordTypes,
  type ParsedTable,
} from "@/lib/import";

describe("value detectors", () => {
  it("recognises valid VINs and rejects bad ones", () => {
    assert.equal(isVin("JF1GD29662G508142"), true);
    assert.equal(isVin("JF1GD29662G50814"), false); // 16 chars
    assert.equal(isVin("JF1GD2966IG508142"), false); // contains I
    assert.equal(isVin("just text"), false);
  });

  it("parses plausible years only", () => {
    assert.equal(parseYear("2008"), 2008);
    assert.equal(parseYear("год: 2015 г.в."), 2015);
    assert.equal(parseYear("1899"), null);
    assert.equal(parseYear("250000"), null);
  });

  it("detects currency from messy money cells", () => {
    assert.equal(detectCurrency("120 000 ₽"), "RUB");
    assert.equal(detectCurrency("$1,500"), "USD");
    assert.equal(detectCurrency("3 200 €"), "EUR");
    assert.equal(detectCurrency("plain"), null);
  });

  it("parses numbers with mixed separators", () => {
    assert.equal(parseNumericValue("1 250,50"), 1250.5);
    assert.equal(parseNumericValue("1,250.50"), 1250.5);
    assert.equal(parseNumericValue("12000₽"), 12000);
    assert.equal(parseNumericValue("—"), null);
  });

  it("flags prices", () => {
    assert.equal(looksLikePrice("85 000 ₽"), true);
    assert.equal(looksLikePrice("3"), false);
  });
});

describe("column detection", () => {
  it("maps Russian headers to canonical fields", () => {
    const table: ParsedTable = {
      name: "Лист1",
      headers: ["Марка", "Двигатель", "Серийный номер", "Цена", "Кол-во"],
      rows: [
        { "Марка": "Subaru", "Двигатель": "EJ205", "Серийный номер": "C123456", "Цена": "85 000 ₽", "Кол-во": "1" },
        { "Марка": "Toyota", "Двигатель": "1JZ", "Серийный номер": "T998877", "Цена": "120 000 ₽", "Кол-во": "1" },
      ],
      parseWarnings: [],
    };
    const mapping = detectColumns(table);
    assert.equal(mapping.fields.brand, "Марка");
    assert.equal(mapping.fields.serial, "Серийный номер");
    assert.equal(mapping.fields.price, "Цена");
    assert.equal(mapping.fields.quantity, "Кол-во");
    assert.equal(mapping.needsAi, false);
  });

  it("recovers a VIN column from values when the header is misleading", () => {
    const table: ParsedTable = {
      name: "data",
      headers: ["Номер", "Описание"],
      rows: [
        { "Номер": "JF1GD29662G508142", "Описание": "Subaru Impreza" },
        { "Номер": "1HGCM82633A004352", "Описание": "Honda Accord" },
      ],
      parseWarnings: [],
    };
    const mapping = detectColumns(table);
    assert.equal(mapping.fields.vin, "Номер");
  });

  it("assigns each field to at most one column", () => {
    const table: ParsedTable = {
      name: "data",
      headers: ["Цена закупки", "Цена продажи"],
      rows: [{ "Цена закупки": "50 000", "Цена продажи": "85 000" }],
      parseWarnings: [],
    };
    const mapping = detectColumns(table);
    const priceColumns = mapping.columns.filter((c) => c.field === "price");
    assert.equal(priceColumns.length, 1);
  });
});

describe("record classification (dictionary first)", () => {
  it("classifies an engine via the domain dictionary", () => {
    const result = classifyRecord({ name: "Двигатель Subaru EJ205", brand: "Subaru" });
    assert.equal(result.recordType, "engine");
    assert.equal(result.target, "motor");
    assert.ok(result.confidence.score >= 0.6);
  });

  it("classifies a transmission", () => {
    const result = classifyRecord({ name: "АКПП Toyota", category: "Коробка передач" });
    assert.equal(result.recordType, "transmission");
  });

  it("classifies a turbo via keywords", () => {
    const result = classifyRecord({ name: "Турбина IHI VF48" });
    assert.equal(result.recordType, "turbo");
  });

  it("classifies optics", () => {
    const result = classifyRecord({ name: "Фара левая передняя" });
    assert.equal(result.recordType, "optics");
  });

  it("recognises a donor car from VIN", () => {
    const result = classifyRecord({ brand: "Subaru", model: "Impreza", vin: "JF1GD29662G508142" });
    assert.equal(result.recordType, "donorCar");
    assert.equal(result.target, "vehicle");
  });

  it("returns unknown for unclassifiable text", () => {
    const result = classifyRecord({ name: "zzz qqq" });
    assert.equal(result.recordType, "unknown");
  });
});

describe("full table analysis", () => {
  const table: ParsedTable = {
    name: "Двигатели",
    headers: ["Марка", "Двигатель", "Серийный номер", "Цена", "Кол-во"],
    rows: [
      { "Марка": "Subaru", "Двигатель": "EJ205", "Серийный номер": "C123456", "Цена": "85 000 ₽", "Кол-во": "1" },
      { "Марка": "Subaru", "Двигатель": "FB20", "Серийный номер": "", "Цена": "90 000 ₽", "Кол-во": "1" },
      { "Марка": "Toyota", "Двигатель": "1JZ-GTE", "Серийный номер": "T998877", "Цена": "", "Кол-во": "1" },
    ],
    parseWarnings: [],
  };

  it("produces classified rows with stats and dominant type", () => {
    const analysis = analyzeTable(table);
    assert.equal(analysis.rows.length, 3);
    assert.equal(analysis.dominantRecordType, "engine");
    assert.equal(analysis.stats.total, 3);
    assert.ok(analysis.stats.recognized >= 1);
  });

  it("flags duplicates against existing keys", () => {
    const analysis = analyzeTable(table, {
      existingKeys: { serials: new Set(["c123456"]) },
    });
    const dupRow = analysis.rows.find((row) => row.values.serial === "C123456");
    assert.ok(dupRow);
    assert.ok(dupRow!.issues.some((issue) => issue.kind === "duplicate"));
    assert.equal(analysis.stats.duplicates, 1);
  });

  it("derives currency from the price cell", () => {
    const analysis = analyzeTable(table);
    const row = analysis.rows[0];
    assert.equal(row.values.currency, "RUB");
  });
});

describe("insights — explainability & suggestions", () => {
  it("explains a high-confidence engine row with positive reasons", () => {
    const analysis = analyzeTable({
      name: "t",
      headers: ["Двигатель", "Серийный номер"],
      rows: [{ "Двигатель": "EJ205", "Серийный номер": "C123456" }],
      parseWarnings: [],
    });
    const explanation = explainRow(analysis.rows[0]);
    assert.equal(explanation.tier, "high");
    assert.ok(explanation.percent >= 90);
    assert.ok(explanation.reasons.some((r) => r.tone === "positive"));
    assert.ok(explanation.reasons.some((r) => r.label.includes("Серийный")));
  });

  it("flags warnings for an unknown row", () => {
    const analysis = analyzeTable({
      name: "t",
      headers: ["Название"],
      rows: [{ "Название": "zzz qqq" }],
      parseWarnings: [],
    });
    const explanation = explainRow(analysis.rows[0]);
    assert.ok(explanation.reasons.some((r) => r.tone === "warning"));
  });

  it("offers inline suggestions for a body part", () => {
    const analysis = analyzeTable({
      name: "t",
      headers: ["Название"],
      rows: [{ "Название": "Фара левая" }],
      parseWarnings: [],
    });
    const suggestions = suggestRecordTypes(analysis.rows[0]);
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions[0].confidence > 0);
  });
});

describe("motor inventory profile (MOTOR LAND layout)", () => {
  const motorLandHeaders = [
    "НОМЕР ДВИГАТЕЛЯ",
    "КОМПЛЕКТАЦИЯ",
    "ОСОБЫЕ ОТМЕТКИ",
    "КОЛ-ВО",
    "КОРОБКА",
    "ДАТА ПРИХОДА",
    "ДАТА ПРОДАЖИ",
  ];

  it("classifies EJ251 engine rows with serial only", () => {
    const analysis = analyzeTable({
      name: "EJ 251",
      headers: motorLandHeaders,
      rows: [
        {
          "НОМЕР ДВИГАТЕЛЯ": "807520",
          "КОМПЛЕКТАЦИЯ": "",
          "ОСОБЫЕ ОТМЕТКИ": "",
          "КОЛ-ВО": "",
          "КОРОБКА": "",
          "ДАТА ПРИХОДА": "11/9/24",
          "ДАТА ПРОДАЖИ": "1/8/26",
        },
      ],
      parseWarnings: [],
    });
    const row = analysis.rows[0];
    assert.equal(row.classification.recordType, "engine");
    assert.equal(row.values.serial, "807520");
    assert.ok(row.values.name?.includes("807520"));
    assert.equal(row.confidence.tier, "high");
    assert.equal(analysis.mapping.fields.price, undefined);
    assert.equal(analysis.mapping.fields.name, undefined);
  });

  it("does not treat arrival/sold dates as donor-car mileage", () => {
    const result = classifyRecord({
      serial: "807520",
      price: "11/9/24",
      mileage: "1/8/26",
    });
    assert.notEqual(result.recordType, "donorCar");
  });

  it("classifies gearbox sheet rows as transmission", () => {
    const analysis = analyzeTable({
      name: "КОРОБКИ",
      headers: ["НОМЕР", "ДАТА"],
      rows: [{ "НОМЕР": "TR580DD5AA", "ДАТА": "6/10/24" }],
      parseWarnings: [],
    });
    assert.equal(analysis.rows[0].classification.recordType, "transmission");
    assert.equal(analysis.mapping.fields.serial, "НОМЕР");
  });
});
