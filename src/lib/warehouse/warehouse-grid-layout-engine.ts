import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
import { GridCellAddress, GridColumnDefinition } from "@/lib/grid/grid-types";

export const WAREHOUSE_GRID_EMPTY_ROWS_EXPAND = 120;
export const WAREHOUSE_GRID_EMPTY_ROWS_THRESHOLD = 48;

/** Read-only aggregate / audit columns in the service inventory grid. */
export const WAREHOUSE_READ_ONLY_COLUMNS = new Set([6, 7, 14]);

const BASE_COLUMNS: GridColumnDefinition[] = [
  { id: "rowNumber", title: "#", width: 40, editable: false, align: "center" },
  { id: "col-1", title: "SKU", width: 120, editable: true, modelField: "sku" },
  { id: "col-2", title: "Название", width: 220, editable: true, modelField: "name" },
  { id: "col-3", title: "Категория", width: 140, editable: true, modelField: "categoryPath" },
  { id: "col-4", title: "Бренд", width: 110, editable: true, modelField: "brandName" },
  {
    id: "col-6",
    title: "На складе",
    width: 92,
    editable: true,
    align: "center",
    modelField: "totalOnHand",
  },
  {
    id: "col-7",
    title: "Резерв",
    width: 80,
    editable: false,
    align: "center",
    modelField: "totalReserved",
  },
  {
    id: "col-8",
    title: "Доступно",
    width: 88,
    editable: false,
    align: "center",
    modelField: "totalAvailable",
  },
  {
    id: "col-9",
    title: "Закупка",
    width: 96,
    editable: true,
    align: "center",
    modelField: "purchasePrice",
  },
  {
    id: "col-10",
    title: "Продажа",
    width: 96,
    editable: true,
    align: "center",
    modelField: "sellPrice",
  },
  { id: "col-11", title: "Поставщик", width: 130, editable: true, modelField: "supplierName" },
  { id: "col-12", title: "Штрихкод", width: 130, editable: true, modelField: "barcodes" },
  {
    id: "col-13",
    title: "Место",
    width: 110,
    editable: true,
    modelField: "warehouseLocation",
  },
  {
    id: "col-14",
    title: "Мин. запас",
    width: 92,
    editable: true,
    align: "center",
    modelField: "lowStockThreshold",
  },
  {
    id: "col-16",
    title: "Обновлено",
    width: 132,
    editable: false,
    align: "center",
    modelField: "updatedAt",
  },
  { id: "action", title: "", width: 110, editable: false, align: "center" },
];

export type WarehouseGridLayoutMetrics = {
  columns: GridColumnDefinition[];
  rowHeight: number;
  headerHeight: number;
  totalWidth: number;
  xOffsets: number[];
};

export function buildWarehouseGridLayoutMetrics(zoom: number): WarehouseGridLayoutMetrics {
  const columns = BASE_COLUMNS.map((column) => ({
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
export const WAREHOUSE_EDITABLE_COL_END = 13;
export const WAREHOUSE_ACTION_COLUMN = 15;

export function isWarehouseReadOnlyColumn(column: number): boolean {
  return WAREHOUSE_READ_ONLY_COLUMNS.has(column);
}

export function isWarehouseEditableColumn(column: number): boolean {
  if (column < WAREHOUSE_EDITABLE_COL_START || column > WAREHOUSE_EDITABLE_COL_END) return false;
  return !isWarehouseReadOnlyColumn(column);
}

/** Map read-only stock columns to the editable source column when clearing cells. */
export function resolveWarehouseClearColumn(column: number): number | null {
  if (isWarehouseEditableColumn(column)) return column;
  if (column === 6 || column === 7) return 5;
  return null;
}
