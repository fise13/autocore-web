import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HISTORY_LIMIT,
  coerceSaleDocument,
  entryTotal,
  parseHistory,
  removeHistoryEntry,
  searchHistory,
  serializeHistory,
  upsertHistory,
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

test("a saved document round-trips through storage", () => {
  const entries = [entry("ПР-267")];
  assert.deepEqual(parseHistory(serializeHistory(entries)), entries);
});

test("re-issuing the same number updates the record instead of adding one", () => {
  const first = upsertHistory([], document("ПР-267"), "2026-09-19T10:00:00.000Z");
  const second = upsertHistory(first, document("ПР-267"), "2026-09-19T12:00:00.000Z");
  assert.equal(second.length, 1);
  assert.equal(second[0]?.savedAt, "2026-09-19T12:00:00.000Z");
});

test("the newest document comes first", () => {
  const history = upsertHistory(
    upsertHistory([], document("ПР-1"), "2026-09-19T10:00:00.000Z"),
    document("ПР-2"),
    "2026-09-19T11:00:00.000Z",
  );
  assert.deepEqual(history.map((row) => row.id), ["ПР-2", "ПР-1"]);
});

test("history is capped so storage cannot grow without bound", () => {
  let history: HistoryEntry[] = [];
  for (let index = 0; index < HISTORY_LIMIT + 10; index += 1) {
    history = upsertHistory(history, document(`ПР-${index}`), "2026-09-19T10:00:00.000Z");
  }
  assert.equal(history.length, HISTORY_LIMIT);
  assert.equal(history[0]?.id, `ПР-${HISTORY_LIMIT + 9}`);
});

test("removing a record leaves the rest untouched", () => {
  assert.deepEqual(removeHistoryEntry([entry("ПР-1"), entry("ПР-2")], "ПР-1").map((row) => row.id), ["ПР-2"]);
});

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

test("corrupt or outdated storage is ignored rather than breaking the page", () => {
  assert.deepEqual(parseHistory(null), []);
  assert.deepEqual(parseHistory("not json"), []);
  assert.deepEqual(parseHistory('{"not":"an array"}'), []);
  assert.deepEqual(parseHistory('[{"data":{"documentNumber":""}}]'), []);
  assert.equal(coerceSaleDocument(null), null);
});

test("a record missing newer fields is repaired, not dropped", () => {
  const restored = parseHistory(
    '[{"id":"ПР-9","savedAt":"2026-09-19T10:00:00.000Z","data":{"documentNumber":"ПР-9","issuedAt":"2026-09-19T10:00:00.000Z","items":[{"title":"Двигатель"}]}}]',
  );
  assert.equal(restored.length, 1);
  assert.deepEqual(restored[0]?.data.customer, { orderer: "", client: "" });
  assert.equal(restored[0]?.data.items[0]?.unit, "шт");
  assert.equal(restored[0]?.data.vatRate, 0);
});
