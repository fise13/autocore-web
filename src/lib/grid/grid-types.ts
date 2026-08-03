export type GridColumnId =
  | "rowNumber"
  | "brandName"
  | "engineCode"
  | "serialCode"
  | "configuration"
  | "notes"
  | "quality"
  | "photo"
  | "quantity"
  | "transmission"
  | "warehouseLocation"
  | "arrivalDate"
  | "soldDate"
  | "action"
  | `col-${number}`;

export type GridCellAddress = {
  row: number;
  column: number;
};

export type GridRange = {
  minRow: number;
  maxRow: number;
  minColumn: number;
  maxColumn: number;
};

export type GridDirection = "up" | "down" | "left" | "right";

export type GridColumnDefinition = {
  id: GridColumnId;
  title: string;
  width: number;
  editable: boolean;
  align?: "left" | "center";
  modelField?: "serialCode" | "configuration" | "notes" | "quality" | "photoUrls" | "imageUrls" | "quantity" | "transmission" | "arrivalDate" | "soldDate" | string;
  /** When set, the cell editor opens the Domain autocomplete for this category. */
  domainCategory?: import("@/lib/domain/types").DomainCategory;
  /** Special cell renderers; photo cells never open the text editor overlay. */
  cellKind?: "text" | "photo";
};

export function makeSingleCellRange(cell: GridCellAddress): GridRange {
  return {
    minRow: cell.row,
    maxRow: cell.row,
    minColumn: cell.column,
    maxColumn: cell.column,
  };
}

export function normalizeRange(a: GridCellAddress, b: GridCellAddress): GridRange {
  return {
    minRow: Math.min(a.row, b.row),
    maxRow: Math.max(a.row, b.row),
    minColumn: Math.min(a.column, b.column),
    maxColumn: Math.max(a.column, b.column),
  };
}

export function isCellInsideRange(cell: GridCellAddress, range: GridRange): boolean {
  return (
    cell.row >= range.minRow &&
    cell.row <= range.maxRow &&
    cell.column >= range.minColumn &&
    cell.column <= range.maxColumn
  );
}
