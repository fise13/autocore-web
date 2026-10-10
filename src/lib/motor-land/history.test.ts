import assert from "node:assert/strict";
import { test } from "node:test";

import {
  coerceSaleDocument,
  hasContent,
  nextDocumentNumber,
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
    customer: { manager: "Мамонтов Д. А.", client: "Иванов И. И." },
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
      customer: { manager: "Алтынов А.", client: "Петров П." },
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

test("records written before the rename still show their manager", () => {
  const restored = parseHistory([
    {
      id: "ПР-8",
      savedAt: "2026-09-19T10:00:00.000Z",
      data: {
        documentNumber: "ПР-8",
        issuedAt: "2026-09-19T10:00:00.000Z",
        customer: { orderer: "Мамонтов Д. А." },
        items: [],
      },
    },
  ]);
  assert.equal(restored[0]?.data.customer.manager, "Мамонтов Д. А.");
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
  assert.deepEqual(restored[0]?.data.customer, { manager: "", client: "" });
  assert.equal(restored[0]?.data.items[0]?.unit, "шт");
  assert.equal(restored[0]?.data.vatRate, 0);
});

test("the next number continues the highest in the series, not the latest", () => {
  assert.equal(nextDocumentNumber([]), "ПР-1");
  assert.equal(nextDocumentNumber(["ПР-267"]), "ПР-268");
  // ПР-5 was re-printed, so it is the most recent — ПР-6 is already taken.
  assert.equal(nextDocumentNumber(["ПР-5", "ПР-9", "ПР-6"]), "ПР-10");
  assert.equal(nextDocumentNumber(["ПР-009"]), "ПР-010");
  assert.equal(nextDocumentNumber(["без-номера", "ПР-3"]), "ПР-4");
});

test("an untouched blank is not worth keeping", () => {
  const blank = createEmptySaleDocument(new Date(0), "ПР-1", "item");
  assert.equal(hasContent(blank), false);
  assert.equal(hasContent({ ...blank, customer: { manager: "", client: "Иванов" } }), true);
  assert.equal(hasContent({ ...blank, items: [{ ...blank.items[0]!, serial: "928420" }] }), true);
});

test("every field survives the trip to the server and back", () => {
  const diagnostic: SaleDocumentData = {
    ...createEmptySaleDocument(new Date("2026-10-10T09:00:00Z"), "ПР-12", "item"),
    kind: "diagnostic",
    customer: { manager: "Мамонтов Д. А.", client: "Иванов И. И." },
    vehicle: {
      vin: "JF1BL5KS57G012345",
      plate: "123 ABC 02",
      year: "2008",
      color: "Серебристый",
      mileage: "185 000 км",
    },
  };
  // The route stores `coerceSaleDocument(body.data)`; the page reads it back through `parseHistory`.
  const stored = coerceSaleDocument(JSON.parse(JSON.stringify(diagnostic)));
  assert.deepEqual(stored, diagnostic);
  assert.deepEqual(parseHistory([{ id: "ПР-12", savedAt: "x", data: stored }])[0]?.data, diagnostic);

  const waybill = createEmptySaleDocument(new Date(0), "ПР-13", "item");
  assert.deepEqual(coerceSaleDocument(JSON.parse(JSON.stringify(waybill))), waybill);
});

test("records from before the diagnostic sheet read back as waybills with no car", () => {
  const legacy = coerceSaleDocument({ documentNumber: "ПР-1", issuedAt: "2026-09-01T00:00:00Z" });
  assert.equal(legacy?.kind, "waybill");
  assert.deepEqual(legacy?.vehicle, { vin: "", plate: "", year: "", color: "", mileage: "" });
});

test("a diagnostic sheet is found by VIN or plate, and counts as filled in", () => {
  const blank = createEmptySaleDocument(new Date(0), "ПР-14", "item");
  const entry = {
    id: "ПР-14",
    savedAt: "x",
    data: { ...blank, kind: "diagnostic" as const, vehicle: { ...blank.vehicle, vin: "JF1BL5", plate: "777 XYZ" } },
  };
  assert.equal(searchHistory([entry], "jf1bl5").length, 1);
  assert.equal(searchHistory([entry], "777").length, 1);
  assert.equal(hasContent(entry.data), true);
  assert.equal(hasContent({ ...blank, vehicle: { ...blank.vehicle, mileage: "100" } }), true);
});
