import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeTotals,
  createEmptySaleDocument,
  formatDateTime,
  formatMoney,
  formatQuantity,
  saleDocumentFileName,
  type SaleDocumentData,
} from "./sale-document";

function sample(overrides: Partial<SaleDocumentData> = {}): SaleDocumentData {
  const base = createEmptySaleDocument(new Date("2026-09-19T14:30:00"), "ПР-267", "item-1");
  return {
    ...base,
    items: [
      { id: "item-1", serial: "928420", title: "Двигатель EJ253 (Subaru)", quantity: 1, unit: "шт", price: 450000 },
      { id: "item-2", serial: "", title: "Комплект прокладок", quantity: 2, unit: "шт", price: 9000 },
    ],
    ...overrides,
  };
}

test("the total is the sum of the lines, with the VAT already inside it split out", () => {
  const totals = computeTotals(sample({ vatRate: 12 }));
  assert.equal(totals.itemsQuantity, 3);
  assert.equal(totals.total, 468000);
  assert.equal(totals.vatIncluded, 50142.86);
});

test("VAT is omitted when the rate is zero", () => {
  assert.equal(computeTotals(sample({ vatRate: 0 })).vatIncluded, 0);
});

test("money prints with non-breaking thousands separators and two decimals", () => {
  assert.equal(formatMoney(182150), "182 150,00");
  assert.equal(formatMoney(999.5), "999,50");
  assert.equal(formatMoney(0), "0,00");
});

test("quantities drop trailing zeros", () => {
  assert.equal(formatQuantity(3), "3");
  assert.equal(formatQuantity(2.5), "2,5");
});

test("the stamp matches the «Принят:» format on the printed form", () => {
  assert.equal(formatDateTime("2026-09-14T17:01:00"), "14.09.2026 17:01");
  assert.equal(formatDateTime("not-a-date"), "");
});

test("file name carries the document number and cannot break a file system", () => {
  assert.equal(saleDocumentFileName(sample()), "Motor Land ПР-267 19.09.2026.docx");
  assert.equal(
    saleDocumentFileName(sample({ documentNumber: "ПР/267" })),
    "Motor Land ПР-267 19.09.2026.docx",
  );
});

test("a fresh document starts with both identity lines empty", () => {
  const empty = createEmptySaleDocument(new Date("2026-09-19T09:00:00"), "ПР-1", "item-1");
  assert.deepEqual(empty.customer, { manager: "", client: "" });
});

test("an empty document still has one line and today's date", () => {
  const empty = createEmptySaleDocument(new Date("2026-09-19T09:00:00"), "ПР-1", "item-1");
  assert.equal(empty.items.length, 1);
  assert.equal(computeTotals(empty).total, 0);
});
