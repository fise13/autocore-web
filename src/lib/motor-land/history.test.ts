import assert from "node:assert/strict";
import { test } from "node:test";

import {
  coerceSaleDocument,
  documentIdFor,
  entryTotal,
  parseHistory,
  searchHistory,
  type HistoryEntry,
} from "./history";
import { createEmptySaleDocument, type SaleDocumentData } from "./sale-document";

function document(number: string, overrides: Partial<SaleDocumentData> = {}): SaleDocumentData {
  return {
    ...createEmptySaleDocument(new Date("2026-09-19T14:30:00"), number, "item-1"),
    customer: { orderer: "Приходящий Клиент", client: "Иванов И. И." },
    items: [
      { id: "item-1", serial: "928420", title: "Двигатель EJ253 (Subaru)", quantity: 1, unit: "шт", price: 450000 },
    ],
    ...overrides,
  };
}

function entry(number: string, overrides: Partial<SaleDocumentData> = {}): HistoryEntry {
  return { id: number, savedAt: "2026-09-19T14:30:00.000Z", data: document(number, overrides) };
}

test("search finds a document by number, party, engine or serial", () => {
  const history = [
    entry("ПР-1"),
    entry("ПР-2", {
      customer: { orderer: "ТОО Алтын", client: "Петров П." },
      items: [{ id: "i", serial: "551203", title: "Двигатель 1MZ-FE (Toyota)", quantity: 1, unit: "шт", price: 700000 }],
    }),
  ];

  assert.deepEqual(searchHistory(history, "ПР-2").map((row) => row.id), ["ПР-2"]);
  assert.deepEqual(searchHistory(history, "петров").map((row) => row.id), ["ПР-2"]);
  assert.deepEqual(searchHistory(history, "928420").map((row) => row.id), ["ПР-1"]);
  assert.deepEqual(searchHistory(history, "subaru").map((row) => row.id), ["ПР-1"]);
});

test("search ignores case and word order, and every term has to match", () => {
  const history = [entry("ПР-1")];
  assert.equal(searchHistory(history, "EJ253 иванов").length, 1);
  assert.equal(searchHistory(history, "иванов ej253").length, 1);
  assert.equal(searchHistory(history, "иванов 1MZ").length, 0);
});

test("an empty search returns the whole history", () => {
  const history = [entry("ПР-1"), entry("ПР-2")];
  assert.equal(searchHistory(history, "   ").length, 2);
});

test("the list summary totals the stored lines", () => {
  assert.equal(entryTotal(entry("ПР-1")), 450000);
});

test("the waybill number becomes a record id that is safe as a path", () => {
  assert.equal(documentIdFor("ПР-267"), "ПР-267");
  assert.equal(documentIdFor(" ПР/267 "), "ПР-267");
  assert.equal(documentIdFor(".."), "без-номера");
  assert.equal(documentIdFor(""), "без-номера");
});

test("a malformed server response is ignored rather than breaking the page", () => {
  assert.deepEqual(parseHistory(null), []);
  assert.deepEqual(parseHistory("not an array"), []);
  assert.deepEqual(parseHistory({ not: "an array" }), []);
  assert.deepEqual(parseHistory([{ data: { documentNumber: "" } }]), []);
  assert.equal(coerceSaleDocument(null), null);
});

test("a record missing newer fields is repaired, not dropped", () => {
  const restored = parseHistory([
    {
      id: "ПР-9",
      savedAt: "2026-09-19T10:00:00.000Z",
      data: { documentNumber: "ПР-9", issuedAt: "2026-09-19T10:00:00.000Z", items: [{ title: "Двигатель" }] },
    },
  ]);
  assert.equal(restored.length, 1);
  assert.deepEqual(restored[0]?.data.customer, { orderer: "", client: "" });
  assert.equal(restored[0]?.data.items[0]?.unit, "шт");
  assert.equal(restored[0]?.data.vatRate, 0);
});
