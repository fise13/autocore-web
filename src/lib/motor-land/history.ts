/**
 * Shape of a waybill record in the account's document history.
 *
 * The records live in Firestore under the signed-in account, so a document
 * issued on the counter PC is there on the phone as well. Reading them is
 * treated as reading untrusted data — a record written by an older version of
 * the form is repaired field by field rather than trusted or dropped.
 */

import type { SaleDocumentData, SaleItem } from "./sale-document";

export type HistoryEntry = {
  /** Firestore document id — the waybill number, made safe for a path. */
  id: string;
  /** ISO timestamp of the last time this document was produced. */
  savedAt: string;
  data: SaleDocumentData;
};

/** How many records the history screen subscribes to. */
export const HISTORY_LIMIT = 200;

/**
 * `ПР-267` → `ПР-267`, `ПР/267` → `ПР-267`. Firestore ids may not contain a
 * slash and may not be `.` or `..`, and re-issuing the same number has to land
 * on the same record rather than create a second one.
 */
export function documentIdFor(documentNumber: string): string {
  const safe = documentNumber.trim().replace(/[/\\]/g, "-").replace(/^\.+$/, "");
  return safe || "без-номера";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asItem(value: unknown, index: number): SaleItem {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: asString(raw.id) || `item-${index}`,
    serial: asString(raw.serial),
    title: asString(raw.title),
    quantity: asNumber(raw.quantity),
    unit: asString(raw.unit) || "шт",
    price: asNumber(raw.price),
  };
}

export function coerceSaleDocument(value: unknown): SaleDocumentData | null {
  const raw = (value ?? {}) as Record<string, unknown>;
  const documentNumber = asString(raw.documentNumber);
  const issuedAt = asString(raw.issuedAt);
  if (!documentNumber || !issuedAt) return null;

  const customer = (raw.customer ?? {}) as Record<string, unknown>;
  return {
    documentNumber,
    issuedAt,
    customer: { orderer: asString(customer.orderer), client: asString(customer.client) },
    items: Array.isArray(raw.items) ? raw.items.map(asItem) : [],
    vatRate: asNumber(raw.vatRate),
  };
}

/** A stored record → a history entry, or `null` when there is no document in it. */
export function coerceHistoryEntry(id: string, value: unknown): HistoryEntry | null {
  const raw = (value ?? {}) as Record<string, unknown>;
  const data = coerceSaleDocument(raw.data);
  if (!data) return null;
  return {
    id: id || documentIdFor(data.documentNumber),
    savedAt: asString(raw.savedAt) || data.issuedAt,
    data,
  };
}
