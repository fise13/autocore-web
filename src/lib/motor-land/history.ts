/**
 * History of the issued waybills.
 *
 * The records live on the server (`/api/motor-land/documents`), so every
 * computer at the counter sees the same list without anyone signing in.
 * Everything read back is treated as untrusted: a record written by an older
 * version of the form is repaired field by field rather than trusted or
 * dropped.
 */

import {
  VEHICLE_FIELDS,
  itemAmount,
  type SaleDocumentData,
  type SaleItem,
  type Vehicle,
} from "./sale-document";

export type HistoryEntry = {
  /** The waybill number, which is also the identity of the record. */
  id: string;
  /** ISO timestamp of the last time this document was produced. */
  savedAt: string;
  data: SaleDocumentData;
};

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
  const vehicle = (raw.vehicle ?? {}) as Record<string, unknown>;
  return {
    // Everything written before the diagnostic sheet existed was a waybill.
    kind: raw.kind === "diagnostic" ? "diagnostic" : "waybill",
    documentNumber,
    issuedAt,
    customer: {
      // `orderer` is what the field was called before it became the manager.
      manager: asString(customer.manager) || asString(customer.orderer),
      client: asString(customer.client),
    },
    vehicle: Object.fromEntries(
      VEHICLE_FIELDS.map(({ key }) => [key, asString(vehicle[key])]),
    ) as Vehicle,
    items: Array.isArray(raw.items) ? raw.items.map(asItem) : [],
    vatRate: asNumber(raw.vatRate),
  };
}

/** Rows coming back from the API — data, never instructions. */
export function parseHistory(parsed: unknown): HistoryEntry[] {
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

/**
 * Free-text search over the history.
 *
 * Matches the document number, both party lines, the car's VIN and plate, and
 * every item's name and serial — what somebody actually remembers about a
 * document they are trying to find again. All terms must match, in any field, in any order.
 */
export function searchHistory(entries: readonly HistoryEntry[], search: string): HistoryEntry[] {
  const terms = search.toLocaleLowerCase("ru").split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...entries];

  return entries.filter((entry) => {
    const haystack = [
      entry.data.documentNumber,
      entry.data.customer.manager,
      entry.data.customer.client,
      entry.data.vehicle.vin,
      entry.data.vehicle.plate,
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

/**
 * `ПР-267` → `ПР-268`. The most recent document sets the series; the number
 * continues the highest one in it. Re-printing an old waybill makes it the most
 * recent, so continuing *that* one would hand out a number already taken —
 * and, the number being the record's id, overwrite it.
 */
export function nextDocumentNumber(numbers: readonly string[]): string {
  const matches = numbers
    .map((number) => number.trim().match(/^(\D*)(\d+)$/))
    .filter((match): match is RegExpMatchArray => match !== null);
  if (matches.length === 0) return "ПР-1";

  const prefix = matches[0]![1]!;
  let highest = matches[0]!;
  for (const match of matches) {
    if (match[1] === prefix && Number(match[2]) > Number(highest[2])) highest = match;
  }
  return `${prefix}${String(Number(highest[2]) + 1).padStart(highest[2]!.length, "0")}`;
}

/** Whether anything was typed in — an untouched blank is not worth a history row. */
export function hasContent(data: SaleDocumentData): boolean {
  return (
    Boolean(data.customer.manager.trim() || data.customer.client.trim()) ||
    Object.values(data.vehicle).some((value) => value.trim()) ||
    data.items.some((item) => item.title.trim() || item.serial.trim())
  );
}
