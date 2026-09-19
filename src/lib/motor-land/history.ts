/**
 * Local history of issued waybills.
 *
 * The document desk is open without a sign-in, so there is no company to bind
 * the records to — they live in the browser that printed them. Keyed by
 * document number: re-issuing ПР-267 updates that record instead of piling up
 * near-duplicates.
 */

import type { SaleDocumentData, SaleItem } from "./sale-document";

export type HistoryEntry = {
  /** The document number, which is also the identity of the record. */
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

function asDocument(value: unknown): SaleDocumentData | null {
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

/**
 * Reads whatever is in storage without trusting it: a record written by an
 * older version of the form, or edited by hand, is dropped rather than crashing
 * the page it is rendered on.
 */
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
    const data = asDocument(row.data);
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

/** Newest first, one record per document number, capped at `limit`. */
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
