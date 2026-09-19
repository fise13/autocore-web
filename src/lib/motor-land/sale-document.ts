/**
 * Motor Land goods waybill («товарная накладная») — data shape and the
 * arithmetic printed on it.
 *
 * Kept free of React and of any DOCX/HTML concern so the same numbers back the
 * on-screen preview, the generated Word file and the unit tests.
 */

export type SaleItem = {
  id: string;
  /** Serial number stamped on the unit (e.g. `928420`). */
  serial: string;
  /** Human title, e.g. `Двигатель EJ253 (Subaru)`. */
  title: string;
  quantity: number;
  unit: string;
  price: number;
};

/**
 * The only two identity lines the form carries. Both are free text: the counter
 * staff decide what «Заказчик» and «Клиент» mean for a given sale.
 */
export type SaleParty = {
  orderer: string;
  client: string;
};

export type SaleDocumentData = {
  /** Printed after `№`, e.g. `ПР-267`. */
  documentNumber: string;
  /** ISO timestamp; the document prints it as `дд.мм.гггг чч:мм`. */
  issuedAt: string;
  customer: SaleParty;
  items: SaleItem[];
  /** VAT percentage already contained in the prices. `0` prints no VAT note. */
  vatRate: number;
};

export type SaleTotals = {
  itemsQuantity: number;
  /** Sum of the line amounts — what «Сумма документа» prints. */
  total: number;
  /** VAT contained in `total`, not added on top. */
  vatIncluded: number;
};

export const COMPANY = {
  legalName: "ИП MOTOR LAND, ИНН 920303300287",
  address: "Г. АЛМАТЫ, ТУРКСИБСКИЙ РАЙОН",
  brand: "Motor Land",
  site: "www.motor-land.kz",
} as const;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function lineTotal(quantity: number, price: number): number {
  return round2((Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(price) ? price : 0));
}

export function itemAmount(item: SaleItem): number {
  return lineTotal(item.quantity, item.price);
}

export function computeTotals(data: SaleDocumentData): SaleTotals {
  const total = round2(data.items.reduce((sum, item) => sum + itemAmount(item), 0));
  const itemsQuantity = round2(
    data.items.reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0), 0),
  );
  const rate = Number.isFinite(data.vatRate) ? Math.max(0, data.vatRate) : 0;

  return {
    itemsQuantity,
    total,
    vatIncluded: rate > 0 ? round2((total * rate) / (100 + rate)) : 0,
  };
}

const NBSP = " ";

/** `182150` → `182 150,00`, with non-breaking thousands spaces so Word never wraps a number. */
export function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const negative = safe < 0;
  const [whole, fraction] = Math.abs(round2(safe)).toFixed(2).split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${negative ? "-" : ""}${grouped},${fraction}`;
}

/** `2.5` → `2,5`; `3` → `3`. Quantities print without trailing zeros. */
export function formatQuantity(value: number): string {
  const safe = Number.isFinite(value) ? round2(value) : 0;
  return Number.isInteger(safe) ? String(safe) : String(safe).replace(".", ",");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `дд.мм.гггг чч:мм`, the stamp the original form prints next to «Принят:». */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `ПР-267 от 19.09.2026` → a file name Word and Finder both accept. */
export function saleDocumentFileName(data: SaleDocumentData): string {
  const stamp = formatDateTime(data.issuedAt).split(" ")[0] ?? "";
  const number = data.documentNumber.trim().replace(/[\\/:*?"<>|]/g, "-") || "документ";
  return `Motor Land ${number}${stamp ? ` ${stamp}` : ""}.docx`;
}

export function createEmptyItem(id: string): SaleItem {
  return { id, serial: "", title: "", quantity: 1, unit: "шт", price: 0 };
}

export function createEmptySaleDocument(now: Date, documentNumber: string, itemId: string): SaleDocumentData {
  return {
    documentNumber,
    issuedAt: now.toISOString(),
    customer: { orderer: "", client: "" },
    items: [createEmptyItem(itemId)],
    vatRate: 12,
  };
}
