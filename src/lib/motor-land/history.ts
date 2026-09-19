/**
 * History of the waybills issued from this browser.
 *
 * The document desk is open without a sign-in, so the records live in the
 * browser that printed them. Everything read back out of storage is treated as
 * untrusted: a record written by an older version of the form is repaired field
 * by field rather than trusted or dropped.
 */

import { itemAmount, type SaleDocumentData, type SaleItem } from "./sale-document";

export type HistoryEntry = {
  /** The waybill number, which is also the identity of the record. */
  id: string;
  /** ISO timestamp of the last time this document was produced. */
  savedAt: string;
  data: SaleDocumentData;
};

export const HISTORY_KEY = "motor-land:documents";
export const HISTORY_LIMIT = 200;

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

export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const entries: HistoryEntry[] = [];
  for (const candidate of parsed) {
    const row = (candidate ?? {}) as Record<string, unknown>;
    const data = coerceSaleDocument(row.data);
    if (!data) continue;
    entries.push({
      id: asString(row.id) || data.documentNumber,
      savedAt: asString(row.savedAt) || data.issuedAt,
      data,
    });
  }
  return entries;
}

export function serializeHistory(entries: readonly HistoryEntry[]): string {
  return JSON.stringify(entries);
}

/** Newest first, one record per waybill number, capped at `limit`. */
export function upsertHistory(
  entries: readonly HistoryEntry[],
  data: SaleDocumentData,
  savedAt: string,
  limit: number = HISTORY_LIMIT,
): HistoryEntry[] {
  const id = data.documentNumber;
  const rest = entries.filter((entry) => entry.id !== id);
  return [{ id, savedAt, data }, ...rest].slice(0, limit);
}

export function removeHistoryEntry(entries: readonly HistoryEntry[], id: string): HistoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

/**
 * Free-text search over the history.
 *
 * Matches the waybill number, both party lines and every item's name and serial
 * — the four things somebody actually remembers about a sale they are trying to
 * find again. All terms must match, in any field, in any order.
 */
export function searchHistory(entries: readonly HistoryEntry[], search: string): HistoryEntry[] {
  const terms = search.toLocaleLowerCase("ru").split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...entries];

  return entries.filter((entry) => {
    const haystack = [
      entry.data.documentNumber,
      entry.data.customer.orderer,
      entry.data.customer.client,
      ...entry.data.items.flatMap((item) => [item.title, item.serial]),
    ]
      .join(" ")
      .toLocaleLowerCase("ru");

    return terms.every((term) => haystack.includes(term));
  });
}

/** Total of a stored document, for the one-line summary in the list. */
export function entryTotal(entry: HistoryEntry): number {
  return entry.data.items.reduce((sum, item) => sum + itemAmount(item), 0);
}

/** Browser-only. Private mode or blocked storage simply yields an empty list. */
export function loadHistory(): HistoryEntry[] {
  try {
    return parseHistory(window.localStorage.getItem(HISTORY_KEY));
  } catch {
    return [];
  }
}

export function saveHistory(entries: readonly HistoryEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, serializeHistory(entries));
  } catch {
    // Storage unavailable or full: the document is still produced, only the
    // record is lost.
  }
}
