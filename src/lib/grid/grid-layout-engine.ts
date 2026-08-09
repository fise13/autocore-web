import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  MOTOR_GRID_COLUMN_FIT,
  MOTOR_GRID_COLUMN_WIDTHS,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
import {
  applyDensityToColumns,
  type GridDensityProfile,
} from "@/lib/grid/grid-density";
import { GridCellAddress, GridColumnDefinition, GridColumnId } from "@/lib/grid/grid-types";
import { userCopy } from "@/lib/user-copy";

export type BuildGridLayoutOptions = {
  hiddenColumnIds?: GridColumnId[];
  /** Scrollport width; drives density band + capped leftover absorb. */
  containerWidth?: number;
};

function motorGridBaseColumns(): GridColumnDefinition[] {
  const columns = userCopy.motors.grid.columns;
  return [
    { id: "rowNumber", title: "#", width: MOTOR_GRID_COLUMN_WIDTHS.rowNumber, editable: false, align: "center" },
    {
      id: "brandName",
      title: columns.brand,
      width: MOTOR_GRID_COLUMN_WIDTHS.brandName,
      editable: true,
      modelField: "brandName",
      domainCategory: "brands",
    },
    {
      id: "engineCode",
      title: columns.engine,
      width: MOTOR_GRID_COLUMN_WIDTHS.engineCode,
      editable: true,
      modelField: "engineCode",
      domainCategory: "engines",
    },
    {
      id: "serialCode",
      title: columns.serial,
      width: MOTOR_GRID_COLUMN_WIDTHS.serialCode,
      editable: true,
      modelField: "serialCode",
    },
    {
      id: "configuration",
      title: columns.configuration,
      width: MOTOR_GRID_COLUMN_WIDTHS.configuration,
      editable: true,
      modelField: "configuration",
    },
    {
      id: "notes",
      title: columns.notes,
      width: MOTOR_GRID_COLUMN_WIDTHS.notes,
      editable: true,
      modelField: "notes",
    },
    {
      id: "quality",
      title: columns.quality,
      width: MOTOR_GRID_COLUMN_WIDTHS.quality,
      editable: true,
      modelField: "quality",
    },
    {
      id: "photo",
      title: columns.photo,
      width: MOTOR_GRID_COLUMN_WIDTHS.photo,
      editable: false,
      align: "center",
      modelField: "photoUrls",
      cellKind: "photo",
    },
    {
      id: "quantity",
      title: columns.quantity,
      width: MOTOR_GRID_COLUMN_WIDTHS.quantity,
      editable: true,
      align: "center",
      modelField: "quantity",
    },
    {
      id: "transmission",
      title: columns.transmission,
      width: MOTOR_GRID_COLUMN_WIDTHS.transmission,
      editable: true,
      modelField: "transmission",
      domainCategory: "transmissions",
    },
    {
      id: "warehouseLocation",
      title: columns.location,
      width: MOTOR_GRID_COLUMN_WIDTHS.warehouseLocation,
      editable: true,
      modelField: "warehouseLocation",
    },
    {
      id: "arrivalDate",
      title: columns.arrivalDate,
      width: MOTOR_GRID_COLUMN_WIDTHS.arrivalDate,
      editable: true,
      align: "center",
      modelField: "arrivalDate",
    },
    {
      id: "soldDate",
      title: columns.soldDate,
      width: MOTOR_GRID_COLUMN_WIDTHS.soldDate,
      editable: false,
      align: "center",
      modelField: "soldDate",
    },
    { id: "action", title: "", width: MOTOR_GRID_COLUMN_WIDTHS.action, editable: false, align: "center" },
  ];
}

export type GridLayoutMetrics = {
  columns: GridColumnDefinition[];
  rowHeight: number;
  headerHeight: number;
  totalWidth: number;
  xOffsets: number[];
  density: GridDensityProfile;
};

export function buildGridLayoutMetrics(
  zoom: number,
  options?: BuildGridLayoutOptions,
): GridLayoutMetrics {
  const hidden = new Set(options?.hiddenColumnIds ?? []);
  const baseColumns = motorGridBaseColumns().filter((column) => !hidden.has(column.id));
  const fitted = applyDensityToColumns({
    columns: baseColumns.map((column) => ({
      width: column.width,
      fit: MOTOR_GRID_COLUMN_FIT[column.id as keyof typeof MOTOR_GRID_COLUMN_FIT],
    })),
    zoom,
    containerWidth: options?.containerWidth,
    scaleDimension: scaleMotorGridDimension,
    baseRowHeight: MOTOR_GRID_BASE_ROW_HEIGHT,
    baseHeaderHeight: MOTOR_GRID_BASE_HEADER_HEIGHT,
  });

  const columns = baseColumns.map((column, index) => ({
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
