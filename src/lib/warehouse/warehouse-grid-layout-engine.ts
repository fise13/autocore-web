import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  MOTOR_GRID_COLUMN_WIDTHS,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
import {
  applyDensityToColumns,
  type GridColumnFitHint,
  type GridDensityProfile,
} from "@/lib/grid/grid-density";
import { GridCellAddress, GridColumnDefinition } from "@/lib/grid/grid-types";
import { userCopy } from "@/lib/user-copy";

export const WAREHOUSE_GRID_EMPTY_ROWS_EXPAND = 120;
export const WAREHOUSE_GRID_EMPTY_ROWS_THRESHOLD = 48;

/** Read-only aggregate / audit columns in the service inventory grid. */
export const WAREHOUSE_READ_ONLY_COLUMNS = new Set([5, 6, 16]);
/** Photo column — interactive cell, not text-editable. */
export const WAREHOUSE_PHOTO_COLUMN = 14;

const FIXED = (width: number): GridColumnFitHint => ({ flex: 0, maxWidth: width });
const NARROW = (width: number): GridColumnFitHint => ({
  flex: 0.35,
  maxWidth: Math.max(width, Math.round(width * 1.15)),
});
const TEXT = (width: number, max: number): GridColumnFitHint => ({
  flex: 1.2,
  maxWidth: Math.max(width, max),
});

function warehouseGridBaseColumns(): Array<GridColumnDefinition & { fit: GridColumnFitHint }> {
  const columns = userCopy.warehouse.grid.columns;
  return [
    { id: "rowNumber", title: "#", width: 40, editable: false, align: "center", fit: FIXED(48) },
    { id: "col-1", title: columns.sku, width: 112, editable: true, modelField: "sku", fit: TEXT(112, 148) },
    {
      id: "col-2",
      title: columns.name,
      width: 188,
      editable: true,
      modelField: "name",
      domainCategory: "consumables",
      fit: TEXT(188, 280),
    },
    {
      id: "col-4",
      title: columns.brand,
      width: 104,
      editable: true,
      modelField: "brandName",
      domainCategory: "brands",
      fit: TEXT(104, 140),
    },
    {
      id: "col-6",
      title: columns.onHand,
      width: 80,
      editable: true,
      align: "center",
      modelField: "totalOnHand",
      fit: FIXED(80),
    },
    {
      id: "col-7",
      title: columns.reserved,
      width: 72,
      editable: false,
      align: "center",
      modelField: "totalReserved",
      fit: FIXED(72),
    },
    {
      id: "col-8",
      title: columns.available,
      width: 80,
      editable: false,
      align: "center",
      modelField: "totalAvailable",
      fit: FIXED(80),
    },
    {
      id: "col-9",
      title: columns.purchase,
      width: 88,
      editable: true,
      align: "center",
      modelField: "purchasePrice",
      fit: NARROW(88),
    },
    {
      id: "col-10",
      title: columns.sale,
      width: 88,
      editable: true,
      align: "center",
      modelField: "sellPrice",
      fit: NARROW(88),
    },
    {
      id: "col-11",
      title: columns.supplier,
      width: 120,
      editable: true,
      modelField: "supplierName",
      fit: TEXT(120, 168),
    },
    {
      id: "col-12",
      title: columns.barcode,
      width: 120,
      editable: true,
      modelField: "barcodes",
      fit: TEXT(120, 168),
    },
    {
      id: "col-13",
      title: columns.location,
      width: 104,
      editable: true,
      modelField: "warehouseLocation",
      fit: TEXT(104, 140),
    },
    {
      id: "col-15",
      title: columns.notes,
      width: 148,
      editable: true,
      modelField: "notes",
      fit: { flex: 1.7, minWidth: 140, maxWidth: Number.POSITIVE_INFINITY, role: "flex" },
    },
    {
      id: "col-17",
      title: columns.quality,
      width: 92,
      editable: true,
      modelField: "quality",
      fit: NARROW(92),
    },
    {
      id: "photo",
      title: columns.photo,
      width: MOTOR_GRID_COLUMN_WIDTHS.photo,
      editable: false,
      align: "center",
      modelField: "imageUrls",
      cellKind: "photo",
      fit: FIXED(MOTOR_GRID_COLUMN_WIDTHS.photo),
    },
    {
      id: "col-14",
      title: columns.minStock,
      width: 84,
      editable: true,
      align: "center",
      modelField: "lowStockThreshold",
      fit: FIXED(84),
    },
    {
      id: "col-16",
      title: columns.updated,
      width: 118,
      editable: false,
      align: "center",
      modelField: "updatedAt",
      fit: NARROW(118),
    },
    {
      id: "action",
      title: "",
      width: 104,
      editable: false,
      align: "center",
      fit: FIXED(104),
    },
  ];
}

export type WarehouseGridLayoutMetrics = {
  columns: GridColumnDefinition[];
  rowHeight: number;
  headerHeight: number;
  totalWidth: number;
  xOffsets: number[];
  density: GridDensityProfile;
};

export type BuildWarehouseGridLayoutOptions = {
  containerWidth?: number;
  widthOverrides?: Readonly<Record<string, number>>;
};

export function buildWarehouseGridLayoutMetrics(
  zoom: number,
  options?: BuildWarehouseGridLayoutOptions,
): WarehouseGridLayoutMetrics {
  const baseColumns = warehouseGridBaseColumns();
  const fitted = applyDensityToColumns({
    columns: baseColumns.map((column) => ({
      id: column.id,
      width: column.width,
      fit: column.fit,
    })),
    zoom,
    containerWidth: options?.containerWidth,
    widthOverrides: options?.widthOverrides,
    scaleDimension: scaleMotorGridDimension,
    baseRowHeight: MOTOR_GRID_BASE_ROW_HEIGHT,
    baseHeaderHeight: MOTOR_GRID_BASE_HEADER_HEIGHT,
  });

  const columns = baseColumns.map(({ fit: _fit, ...column }, index) => ({
    ...column,
    width: fitted.widths[index] ?? column.width,
  }));

  return {
    columns,
    rowHeight: fitted.rowHeight,
    headerHeight: fitted.headerHeight,
    totalWidth: fitted.totalWidth,
    xOffsets: fitted.xOffsets,
    density: fitted.density,
  };
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
  if (column === WAREHOUSE_PHOTO_COLUMN) return column;
  if (column === 5 || column === 6) return 4;
  return null;
}
