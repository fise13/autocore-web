const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const NBSP = /\u00A0/g;

export function cleanCell(value: string): string {
  return value
    .replace(NBSP, " ")
    .replace(ZERO_WIDTH, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanBrandSymbol(value: string): string {
  return cleanCell(value)
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNumeric(value: string): number | undefined {
  const cleaned = cleanCell(value)
    .replace(/[^\d,.\-]/g, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseQuantity(value: string): number {
  const parsed = parseNumeric(value);
  if (parsed == null) return 0;
  return parsed;
}

export function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const base = cleanCell(header) || "column";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

export function isEmptyRow(row: Record<string, string>): boolean {
  return Object.values(row).every((value) => !cleanCell(value));
}

export function rowContentHash(row: Record<string, string>, fields: string[]): string {
  return fields.map((field) => cleanCell(row[field] ?? "").toLowerCase()).join("|");
}

export function detectHeaderRowIndex(matrix: string[][]): number {
  const motorHeaderPattern =
    /номер\s*двигател|комплектац|особые\s*отмет|кол-?во|дата\s*приход|дата\s*продаж/i;

  for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
    const row = matrix[index] ?? [];
    const nonEmpty = row.map(cleanCell).filter(Boolean);
    const joined = nonEmpty.join(" ");
    if (nonEmpty.length >= 2 && motorHeaderPattern.test(joined)) {
      return index;
    }
  }

  for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
    const row = matrix[index] ?? [];
    const nonEmpty = row.map(cleanCell).filter(Boolean);
    const joined = nonEmpty.join(" ").toLowerCase();
    if (/^номер$/i.test(nonEmpty[0] ?? "") && /дата/i.test(joined)) {
      return index;
    }
  }

  for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
    const row = matrix[index] ?? [];
    const nonEmpty = row.map(cleanCell).filter(Boolean);
    const unique = new Set(nonEmpty.map((value) => value.toLowerCase()));
    if (unique.size >= 3) return index;
  }
  return 0;
}

export function preprocessRows(rows: Record<string, string>[]): {
  rows: Record<string, string>[];
  duplicateRowIndexes: Set<number>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const cleanedRows: Record<string, string>[] = [];
  const seen = new Map<string, number>();
  const duplicateRowIndexes = new Set<number>();

  for (const row of rows) {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      cleaned[key] = cleanCell(value);
    }
    if (isEmptyRow(cleaned)) continue;
    cleanedRows.push(cleaned);
  }

  const hashFields = Object.keys(cleanedRows[0] ?? {});
  cleanedRows.forEach((row, index) => {
    const hash = rowContentHash(row, hashFields);
    if (!hash.replace(/\|/g, "")) return;
    if (seen.has(hash)) {
      duplicateRowIndexes.add(index);
      warnings.push(`Строка ${index + 1} — дубликат строки ${(seen.get(hash) ?? 0) + 1}`);
    } else {
      seen.set(hash, index);
    }
  });

  return { rows: cleanedRows, duplicateRowIndexes, warnings };
}

export function rowQualityScore(normalized: Record<string, unknown>): number {
  const weights: Array<[string, number]> = [
    ["sku", 0.25],
    ["name", 0.25],
    ["quantity", 0.15],
    ["purchasePrice", 0.1],
    ["sellPrice", 0.05],
    ["brandName", 0.05],
    ["barcodes", 0.05],
    ["categoryPath", 0.05],
    ["supplierName", 0.05],
  ];
  let score = 0;
  for (const [field, weight] of weights) {
    const value = normalized[field];
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && !value.trim()) continue;
    score += weight;
  }
  return Math.min(1, score);
}
