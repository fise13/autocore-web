import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  MOTOR_GRID_COLUMN_WIDTHS,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
import { GridCellAddress, GridColumnDefinition } from "@/lib/grid/grid-types";
import { userCopy } from "@/lib/user-copy";

export const WAREHOUSE_GRID_EMPTY_ROWS_EXPAND = 120;
export const WAREHOUSE_GRID_EMPTY_ROWS_THRESHOLD = 48;

/** Read-only aggregate / audit columns in the service inventory grid. */
export const WAREHOUSE_READ_ONLY_COLUMNS = new Set([5, 6, 16]);
/** Photo column — interactive cell, not text-editable. */
export const WAREHOUSE_PHOTO_COLUMN = 14;

function warehouseGridBaseColumns(): GridColumnDefinition[] {
  const columns = userCopy.warehouse.grid.columns;
  return [
    { id: "rowNumber", title: "#", width: 40, editable: false, align: "center" },
    { id: "col-1", title: columns.sku, width: 120, editable: true, modelField: "sku" },
    {
      id: "col-2",
      title: columns.name,
      width: 220,
      editable: true,
      modelField: "name",
      domainCategory: "consumables",
    },
    {
      id: "col-4",
      title: columns.brand,
      width: 110,
      editable: true,
      modelField: "brandName",
      domainCategory: "brands",
    },
    {
      id: "col-6",
      title: columns.onHand,
      width: 92,
      editable: true,
      align: "center",
      modelField: "totalOnHand",
    },
    {
      id: "col-7",
      title: columns.reserved,
      width: 80,
      editable: false,
      align: "center",
      modelField: "totalReserved",
    },
    {
      id: "col-8",
      title: columns.available,
      width: 88,
      editable: false,
      align: "center",
      modelField: "totalAvailable",
    },
    {
      id: "col-9",
      title: columns.purchase,
      width: 96,
      editable: true,
      align: "center",
      modelField: "purchasePrice",
    },
    {
      id: "col-10",
      title: columns.sale,
      width: 96,
      editable: true,
      align: "center",
      modelField: "sellPrice",
    },
    { id: "col-11", title: columns.supplier, width: 130, editable: true, modelField: "supplierName" },
    { id: "col-12", title: columns.barcode, width: 130, editable: true, modelField: "barcodes" },
    {
      id: "col-13",
      title: columns.location,
      width: 110,
      editable: true,
      modelField: "warehouseLocation",
    },
    {
      id: "col-15",
      title: columns.notes,
      width: 160,
      editable: true,
      modelField: "notes",
    },
    {
      id: "col-17",
      title: columns.quality,
      width: 100,
      editable: true,
      modelField: "quality",
    },
    {
      id: "photo",
      title: columns.photo,
      width: MOTOR_GRID_COLUMN_WIDTHS.photo,
      editable: false,
      align: "center",
      modelField: "imageUrls",
      cellKind: "photo",
    },
    {
      id: "col-14",
      title: columns.minStock,
      width: 92,
      editable: true,
      align: "center",
      modelField: "lowStockThreshold",
    },
    {
      id: "col-16",
      title: columns.updated,
      width: 132,
      editable: false,
      align: "center",
      modelField: "updatedAt",
    },
    { id: "action", title: "", width: 110, editable: false, align: "center" },
  ];
}

export type WarehouseGridLayoutMetrics = {
  columns: GridColumnDefinition[];
  rowHeight: number;
  headerHeight: number;
  totalWidth: number;
  xOffsets: number[];
};

export function buildWarehouseGridLayoutMetrics(zoom: number): WarehouseGridLayoutMetrics {
  const columns = warehouseGridBaseColumns().map((column) => ({
    ...column,
    width: scaleMotorGridDimension(column.width, zoom),
  }));
  const rowHeight = scaleMotorGridDimension(MOTOR_GRID_BASE_ROW_HEIGHT, zoom);
  const headerHeight = scaleMotorGridDimension(MOTOR_GRID_BASE_HEADER_HEIGHT, zoom);
  const xOffsets: number[] = [];
  let cursor = 0;
  for (const column of columns) {
    xOffsets.push(cursor);
    cursor += column.width;
  }
  return { columns, rowHeight, headerHeight, totalWidth: cursor, xOffsets };
}

export function warehouseCellFrame(layout: WarehouseGridLayoutMetrics, cell: GridCellAddress) {
  const x = layout.xOffsets[cell.column] ?? 0;
  return {
    x,
    y: cell.row * layout.rowHeight,
    width: layout.columns[cell.column]?.width ?? 0,
    height: layout.rowHeight,
  };
}

export const WAREHOUSE_EDITABLE_COL_START = 1;
export const WAREHOUSE_EDITABLE_COL_END = 15;
export const WAREHOUSE_ACTION_COLUMN = 17;

export function isWarehouseReadOnlyColumn(column: number): boolean {
  return WAREHOUSE_READ_ONLY_COLUMNS.has(column) || column === WAREHOUSE_PHOTO_COLUMN;
}

export function isWarehouseEditableColumn(column: number): boolean {
  if (column < WAREHOUSE_EDITABLE_COL_START || column > WAREHOUSE_EDITABLE_COL_END) return false;
  return !isWarehouseReadOnlyColumn(column);
}

/** Map read-only stock columns to the editable source column when clearing cells. */
export function resolveWarehouseClearColumn(column: number): number | null {
  if (isWarehouseEditableColumn(column)) return column;
  if (column === 5 || column === 6) return 4;
  return null;
}
