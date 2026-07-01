import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  MOTOR_GRID_COLUMN_WIDTHS,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
import { GridCellAddress, GridColumnDefinition, GridColumnId } from "@/lib/grid/grid-types";

export type BuildGridLayoutOptions = {
  hiddenColumnIds?: GridColumnId[];
};

const BASE_COLUMNS: GridColumnDefinition[] = [
  { id: "rowNumber", title: "#", width: MOTOR_GRID_COLUMN_WIDTHS.rowNumber, editable: false, align: "center" },
  {
    id: "brandName",
    title: "Бренд",
    width: MOTOR_GRID_COLUMN_WIDTHS.brandName,
    editable: true,
    modelField: "brandName",
    domainCategory: "brands",
  },
  {
    id: "engineCode",
    title: "Двигатель",
    width: MOTOR_GRID_COLUMN_WIDTHS.engineCode,
    editable: true,
    modelField: "engineCode",
    domainCategory: "engines",
  },
  { id: "serialCode", title: "Номер двигателя", width: MOTOR_GRID_COLUMN_WIDTHS.serialCode, editable: true, modelField: "serialCode" },
  { id: "configuration", title: "Комплектация", width: MOTOR_GRID_COLUMN_WIDTHS.configuration, editable: true, modelField: "configuration" },
  { id: "notes", title: "Особые отметки", width: MOTOR_GRID_COLUMN_WIDTHS.notes, editable: true, modelField: "notes" },
  { id: "quantity", title: "Кол-во", width: MOTOR_GRID_COLUMN_WIDTHS.quantity, editable: true, align: "center", modelField: "quantity" },
  {
    id: "transmission",
    title: "Коробка",
    width: MOTOR_GRID_COLUMN_WIDTHS.transmission,
    editable: true,
    modelField: "transmission",
    domainCategory: "transmissions",
  },
  { id: "arrivalDate", title: "Дата прихода", width: MOTOR_GRID_COLUMN_WIDTHS.arrivalDate, editable: true, align: "center", modelField: "arrivalDate" },
  { id: "soldDate", title: "Дата продажи", width: MOTOR_GRID_COLUMN_WIDTHS.soldDate, editable: false, align: "center", modelField: "soldDate" },
  { id: "action", title: "", width: MOTOR_GRID_COLUMN_WIDTHS.action, editable: false, align: "center" },
];

export type GridLayoutMetrics = {
  columns: GridColumnDefinition[];
  rowHeight: number;
  headerHeight: number;
  totalWidth: number;
  xOffsets: number[];
};

export function buildGridLayoutMetrics(
  zoom: number,
  options?: BuildGridLayoutOptions,
): GridLayoutMetrics {
  const hidden = new Set(options?.hiddenColumnIds ?? []);
  const columns = BASE_COLUMNS.filter((column) => !hidden.has(column.id)).map((column) => ({
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

export function cellFrame(layout: GridLayoutMetrics, cell: GridCellAddress): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const x = layout.xOffsets[cell.column] ?? 0;
  return {
    x,
    y: cell.row * layout.rowHeight,
    width: layout.columns[cell.column]?.width ?? 0,
    height: layout.rowHeight,
  };
}
