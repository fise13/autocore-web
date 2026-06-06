import { resolveSheetBrandAndEngine } from "@/lib/motors/import/brand-engine-intelligence";

export type EngineFieldMapping =
  | "serialCode"
  | "configuration"
  | "notes"
  | "quantity"
  | "transmission"
  | "arrivalDate"
  | "soldDate"
  | "brandName"
  | "engineCode";

export type ColumnMapping = {
  columnIndex: number;
  headerValue?: string;
  engineFieldMapping?: EngineFieldMapping;
};

export type SheetColumnMapping = {
  columnMappings: ColumnMapping[];
  headerRowIndex: number | null;
};

export function normalizeHeader(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export function detectEngineField(header: string): EngineFieldMapping | undefined {
  const normalized = normalizeHeader(header);

  if (normalized.includes("НОМЕР") && (normalized.includes("ДВИГАТЕЛ") || normalized.includes("МОТОР"))) {
    return "serialCode";
  }
  if (normalized === "НОМЕР" || normalized === "SERIAL" || normalized === "№") {
    return "serialCode";
  }

  if (normalized === "БРЕНД" || normalized === "BRAND") {
    return "brandName";
  }

  if (
    (normalized.includes("ДВИГАТЕЛ") || normalized.includes("ENGINE")) &&
    !normalized.includes("НОМЕР")
  ) {
    return "engineCode";
  }

  if (normalized.includes("КОМПЛЕКТ") || normalized.includes("КОМПЛЕКС") || normalized === "КОМПЛЕКТАЦИЯ") {
    return "configuration";
  }

  if (
    normalized.includes("ОСОБ") ||
    normalized.includes("ОТМЕТ") ||
    normalized.includes("ПРИМЕЧ") ||
    normalized === "ЗАМЕТКИ" ||
    normalized === "NOTES" ||
    normalized.includes("КОММЕНТ")
  ) {
    return "notes";
  }

  if (normalized.includes("КОЛ") || normalized.includes("КОЛИЧ") || normalized === "QTY" || normalized === "QUANTITY") {
    return "quantity";
  }

  if (
    normalized.includes("КОРОБ") ||
    normalized.includes("КПП") ||
    normalized.includes("ТРАНСМИСС") ||
    normalized === "GEARBOX" ||
    normalized === "TRANSMISSION"
  ) {
    return "transmission";
  }

  if (normalized.includes("ПРИХОД") || normalized.includes("ПОСТУП") || normalized.includes("ARRIVAL")) {
    return "arrivalDate";
  }
  if (normalized.includes("ДАТА") && (normalized.includes("ПРИХОД") || normalized.includes("ПОСТУП"))) {
    return "arrivalDate";
  }

  if (normalized.includes("ПРОДАЖ") || normalized.includes("SOLD")) {
    return "soldDate";
  }
  if (normalized.includes("ДАТА") && normalized.includes("ПРОДАЖ")) {
    return "soldDate";
  }

  return undefined;
}

export function createAutoColumnMapping(rows: string[][]): SheetColumnMapping {
  const maxColumn = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let headerRowIndex: number | null = null;
  let headerRow: string[] | null = null;

  for (let index = 0; index < Math.min(rows.length, 10); index += 1) {
    const row = rows[index] ?? [];
    const nonEmptyCount = row.filter((cell) => cell.trim().length > 0).length;
    if (nonEmptyCount >= 2) {
      headerRowIndex = index;
      headerRow = row;
      break;
    }
  }

  const columnMappings: ColumnMapping[] = [];
  for (let columnIndex = 0; columnIndex < maxColumn; columnIndex += 1) {
    const headerValue = headerRow?.[columnIndex]?.trim() ?? "";
    columnMappings.push({
      columnIndex,
      headerValue: headerValue || undefined,
      engineFieldMapping: headerValue ? detectEngineField(headerValue) : undefined,
    });
  }

  return { columnMappings, headerRowIndex };
}

export function isLikelySoldSheetName(name: string): boolean {
  const normalized = normalizeHeader(name);
  return (
    normalized.includes("ПРОДАН") ||
    normalized.includes("ПРОДАЖ") ||
    normalized.includes("SOLD") ||
    normalized.includes("SALES")
  );
}

export function parseSheetBrandEngine(sheetName: string): { brandName: string; engineCode: string } | null {
  const trimmed = sheetName.trim();
  if (!trimmed || isLikelySoldSheetName(trimmed) || normalizeHeader(trimmed) === "В НАЛИЧИИ") {
    return null;
  }

  const resolved = resolveSheetBrandAndEngine(trimmed);
  if (!resolved.brandName && !resolved.engineCode) return null;

  return {
    brandName: resolved.brandName,
    engineCode: resolved.engineCode,
  };
}
