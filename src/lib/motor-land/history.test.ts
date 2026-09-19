import assert from "node:assert/strict";
import { test } from "node:test";

import { coerceHistoryEntry, coerceSaleDocument, documentIdFor } from "./history";

test("the document number is the record id, made safe for a Firestore path", () => {
  assert.equal(documentIdFor("ПР-267"), "ПР-267");
  assert.equal(documentIdFor(" ПР-267 "), "ПР-267");
  assert.equal(documentIdFor("ПР/267"), "ПР-267");
  assert.equal(documentIdFor(".."), "без-номера");
  assert.equal(documentIdFor(""), "без-номера");
});

test("re-issuing the same number lands on the same record", () => {
  assert.equal(documentIdFor("ПР-267"), documentIdFor("ПР-267"));
});

test("a stored record becomes a history entry", () => {
  const entry = coerceHistoryEntry("ПР-267", {
    savedAt: "2026-09-19T14:30:00.000Z",
    data: {
      documentNumber: "ПР-267",
      issuedAt: "2026-09-19T14:30:00.000Z",
      customer: { orderer: "Приходящий Клиент", client: "Иванов И. И." },
      items: [{ id: "item-1", serial: "928420", title: "Двигатель EJ253", quantity: 1, unit: "шт", price: 450000 }],
      vatRate: 12,
    },
  });

  assert.equal(entry?.id, "ПР-267");
  assert.equal(entry?.data.items[0]?.price, 450000);
});

test("a record with no document in it is skipped instead of rendering blank", () => {
  assert.equal(coerceHistoryEntry("x", {}), null);
  assert.equal(coerceHistoryEntry("x", { data: { documentNumber: "" } }), null);
  assert.equal(coerceSaleDocument(null), null);
});

test("fields added after a record was written are filled with safe defaults", () => {
  const entry = coerceHistoryEntry("ПР-9", {
    data: { documentNumber: "ПР-9", issuedAt: "2026-09-19T10:00:00.000Z", items: [{ title: "Двигатель" }] },
  });

  assert.deepEqual(entry?.data.customer, { orderer: "", client: "" });
  assert.equal(entry?.data.items[0]?.unit, "шт");
  assert.equal(entry?.data.vatRate, 0);
  assert.equal(entry?.savedAt, "2026-09-19T10:00:00.000Z");
});

test("a hostile value in a stored field cannot change the type of the entry", () => {
  const entry = coerceHistoryEntry("ПР-9", {
    savedAt: 42,
    data: {
      documentNumber: "ПР-9",
      issuedAt: "2026-09-19T10:00:00.000Z",
      customer: "не объект",
      items: "не массив",
      vatRate: "двенадцать",
    },
  });

  assert.deepEqual(entry?.data.items, []);
  assert.deepEqual(entry?.data.customer, { orderer: "", client: "" });
  assert.equal(entry?.data.vatRate, 0);
  assert.equal(entry?.savedAt, "2026-09-19T10:00:00.000Z");
});
