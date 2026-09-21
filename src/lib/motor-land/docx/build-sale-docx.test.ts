import assert from "node:assert/strict";
import { test } from "node:test";

import { createEmptySaleDocument, type SaleDocumentData } from "../sale-document";
import { buildSaleDocxParts } from "./build-sale-docx";
import { packDocx } from "./package";

const LOGO = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function sample(overrides: Partial<SaleDocumentData> = {}): SaleDocumentData {
  const base = createEmptySaleDocument(new Date("2026-09-19T14:30:00"), "ПР-267", "item-1");
  return {
    ...base,
    customer: { manager: "Мамонтов Д. А.", client: "Иванов И. И., +7 777 123 45 67" },
    items: [
      { id: "item-1", serial: "928420", title: "Двигатель EJ253 (Subaru)", quantity: 1, unit: "шт", price: 450000 },
    ],
    ...overrides,
  };
}

function documentXml(data: SaleDocumentData): string {
  return String(buildSaleDocxParts(data, { logoPng: LOGO })["word/document.xml"]);
}

test("the form keeps only the two identity lines", () => {
  const xml = documentXml(sample());
  assert.ok(xml.includes("Менеджер:"));
  assert.ok(xml.includes("Клиент:"));
  for (const removed of ["VIN-номер", "Год выпуска", "Плательщик", "Причины обращения", "Пробег"]) {
    assert.ok(!xml.includes(removed), `${removed} should no longer be printed`);
  }
});

test("the package carries every part Word needs to open the file", () => {
  const parts = buildSaleDocxParts(sample(), { logoPng: LOGO });
  for (const path of [
    "[Content_Types].xml",
    "_rels/.rels",
    "word/document.xml",
    "word/_rels/document.xml.rels",
    "word/styles.xml",
    "word/footer1.xml",
    "word/media/logo.png",
  ]) {
    assert.ok(parts[path], `missing ${path}`);
  }
});

test("every image relationship used in the body is declared", () => {
  const parts = buildSaleDocxParts(sample(), { logoPng: LOGO });
  const rels = String(parts["word/_rels/document.xml.rels"]);
  const body = String(parts["word/document.xml"]);
  for (const id of body.match(/r:embed="(rId\d+)"/g) ?? []) {
    const relationshipId = id.slice('r:embed="'.length, -1);
    assert.match(rels, new RegExp(`Id="${relationshipId}"`), `${relationshipId} is not in the rels part`);
  }
});

test("waybill and warranty share one sheet — no page break", () => {
  const xml = documentXml(sample());
  assert.ok(!xml.includes('w:type="page"'), "the document must stay on a single page");
  assert.ok(xml.indexOf("Двигатель EJ253") < xml.indexOf("Условия гарантии"));
  assert.ok(xml.includes("Б.У. агрегаты не подлежат обмену"));
});

test("the three shop numbers are printed in the header", () => {
  const xml = documentXml(sample());
  for (const phone of ["8 701 144 54 45", "8 777 144 54 45", "8 707 144 54 45"]) {
    assert.ok(xml.includes(phone), `${phone} is missing`);
  }
});

test("the warranty is always included — there is no opt-out", () => {
  const xml = documentXml(sample({ items: [] }));
  assert.ok(xml.includes("Условия гарантии"));
  assert.ok(xml.includes("контрактные агрегаты"));
});

test("the buyer signs at the foot of the sheet, and only the buyer", () => {
  const parts = buildSaleDocxParts(sample(), { logoPng: LOGO });
  // The line lives in the page footer, which is what pins it to the bottom.
  assert.ok(String(parts["word/footer1.xml"]).includes("Покупатель:"));
  assert.ok(!String(parts["word/document.xml"]).includes("Покупатель:"));
  assert.ok(!String(parts["word/document.xml"]).includes("Продавец:"));
});

test("the front page is a waybill: no works table, no payment or debt lines", () => {
  const xml = documentXml(sample());
  assert.ok(xml.includes("Товарная накладная № "));
  for (const removed of ["Выполненные работы", "Задолженность", "Оплачено", "Принят:", "Продавец:"]) {
    assert.ok(!xml.includes(removed), `${removed} should no longer be printed`);
  }
});

test("customer text is XML-escaped rather than breaking the document", () => {
  const xml = documentXml(sample({ customer: { manager: 'ТОО <A&B> "ок"', client: "" } }));
  assert.ok(xml.includes("ТОО &lt;A&amp;B&gt; &quot;ок&quot;"));
});

test("the totals block prints the VAT note only for a non-zero rate", () => {
  assert.ok(documentXml(sample({ vatRate: 12 })).includes("в т.ч. НДС"));
  assert.ok(!documentXml(sample({ vatRate: 0 })).includes("в т.ч. НДС"));
});

test("the packed file is a zip that starts with the docx signature", async () => {
  const bytes = await packDocx(buildSaleDocxParts(sample(), { logoPng: LOGO }));
  assert.ok(bytes.length > 1000);
  assert.deepEqual([...bytes.slice(0, 2)], [0x50, 0x4b]);
});
