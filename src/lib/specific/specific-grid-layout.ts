import { SpecificColumnDef } from "@/domain/specific-category";
import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  MOTOR_GRID_COLUMN_FIT,
  MOTOR_GRID_COLUMN_WIDTHS,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
import {
  applyDensityToColumns,
  type GridColumnFitHint,
  type GridDensityProfile,
} from "@/lib/grid/grid-density";
import { GridCellAddress, GridColumnDefinition, GridColumnId } from "@/lib/grid/grid-types";
import { SpecificHeaderMapping } from "@/lib/specific/specific-header-mapping";
import { schemaToHeaderMapping } from "@/lib/specific/specific-category-schema";
import {
  SPECIFIC_PHOTO_URLS_KEY,
  SPECIFIC_QUALITY_KEY,
} from "@/lib/specific/specific-photo-quality";
import { userCopy } from "@/lib/user-copy";

const CANONICAL_WIDTHS = [
  MOTOR_GRID_COLUMN_WIDTHS.serialCode,
  MOTOR_GRID_COLUMN_WIDTHS.configuration,
  MOTOR_GRID_COLUMN_WIDTHS.notes,
  MOTOR_GRID_COLUMN_WIDTHS.quantity,
  MOTOR_GRID_COLUMN_WIDTHS.transmission,
  MOTOR_GRID_COLUMN_WIDTHS.arrivalDate,
  MOTOR_GRID_COLUMN_WIDTHS.soldDate,
] as const;

const CANONICAL_COLUMN_IDS = [
  "serialCode",
  "configuration",
  "notes",
  "quantity",
  "transmission",
  "arrivalDate",
  "soldDate",
] as const satisfies readonly GridColumnId[];

const CANONICAL_FIT: GridColumnFitHint[] = [
  MOTOR_GRID_COLUMN_FIT.serialCode,
  MOTOR_GRID_COLUMN_FIT.configuration,
  MOTOR_GRID_COLUMN_FIT.notes,
  MOTOR_GRID_COLUMN_FIT.quantity,
  MOTOR_GRID_COLUMN_FIT.transmission,
  MOTOR_GRID_COLUMN_FIT.arrivalDate,
  MOTOR_GRID_COLUMN_FIT.soldDate,
];

function columnGridId(column: SpecificColumnDef, index: number): GridColumnId {
  if (column.kind === "canonical" && column.slotIndex != null) {
    return CANONICAL_COLUMN_IDS[column.slotIndex] ?? `col-${index}`;
  }
  return `col-${index}`;
}

function columnWidth(column: SpecificColumnDef, index: number): number {
  if (column.width) return column.width;
  if (column.kind === "canonical" && column.slotIndex != null) {
    return CANONICAL_WIDTHS[column.slotIndex] ?? MOTOR_GRID_COLUMN_WIDTHS.notes;
  }
  return index === 0
    ? MOTOR_GRID_COLUMN_WIDTHS.serialCode
    : MOTOR_GRID_COLUMN_WIDTHS.notes;
}

function columnFit(column: SpecificColumnDef, index: number): GridColumnFitHint {
  if (column.kind === "canonical" && column.slotIndex != null) {
    return CANONICAL_FIT[column.slotIndex] ?? { flex: 1.2, maxWidth: 220 };
  }
  const width = columnWidth(column, index);
  if (index === 3) return { flex: 0, maxWidth: width };
  return { flex: 1.2, maxWidth: Math.round(width * 1.35) };
}

function columnAlign(column: SpecificColumnDef, index: number): "left" | "center" {
  if (column.kind === "canonical") {
    if (column.slotIndex === 3 || (column.slotIndex != null && column.slotIndex >= 5)) {
      return "center";
    }
  }
  return index === 3 ? "center" : "left";
}

export type BuildSpecificGridLayoutOptions = {
  containerWidth?: number;
};

export function buildSpecificMotorGridLayout(
  columnSchema: SpecificColumnDef[],
  zoom: number,
  options?: BuildSpecificGridLayoutOptions,
) {
  const mapping: SpecificHeaderMapping = schemaToHeaderMapping(columnSchema);
  const qualityTitle = userCopy.motors.grid.columns.quality;
  const photoTitle = userCopy.motors.grid.columns.photo;

  const schemaColumns: Array<GridColumnDefinition & { fit: GridColumnFitHint }> = columnSchema.map(
    (column, index) => ({
      id: columnGridId(column, index),
      title: column.title,
      width: columnWidth(column, index),
      editable: column.editable !== false,
      align: columnAlign(column, index),
      modelField: column.key,
      fit: columnFit(column, index),
    }),
  );

  const injected: Array<GridColumnDefinition & { fit: GridColumnFitHint }> = [
    {
      id: "quality",
      title: qualityTitle,
      width: MOTOR_GRID_COLUMN_WIDTHS.quality,
      editable: true,
      modelField: SPECIFIC_QUALITY_KEY,
      fit: MOTOR_GRID_COLUMN_FIT.quality,
    },
    {
      id: "photo",
      title: photoTitle,
      width: MOTOR_GRID_COLUMN_WIDTHS.photo,
      editable: false,
      align: "center",
      modelField: SPECIFIC_PHOTO_URLS_KEY,
      cellKind: "photo",
      fit: MOTOR_GRID_COLUMN_FIT.photo,
    },
  ];

  const baseColumns: Array<GridColumnDefinition & { fit: GridColumnFitHint }> = [
    {
      id: "rowNumber",
      title: "#",
      width: MOTOR_GRID_COLUMN_WIDTHS.rowNumber,
      editable: false,
      align: "center",
      fit: MOTOR_GRID_COLUMN_FIT.rowNumber,
    },
    ...schemaColumns,
    ...injected,
    {
      id: "action",
      title: "",
      width: MOTOR_GRID_COLUMN_WIDTHS.action,
      editable: false,
      align: "center" as const,
      fit: MOTOR_GRID_COLUMN_FIT.action,
    },
  ];

  const fitted = applyDensityToColumns({
    columns: baseColumns.map((column) => ({ width: column.width, fit: column.fit })),
    zoom,
    containerWidth: options?.containerWidth,
    scaleDimension: scaleMotorGridDimension,
    baseRowHeight: MOTOR_GRID_BASE_ROW_HEIGHT,
    baseHeaderHeight: MOTOR_GRID_BASE_HEADER_HEIGHT,
  });

  const columns: GridColumnDefinition[] = baseColumns.map(({ fit: _fit, ...column }, index) => ({
    ...column,
    width: fitted.widths[index] ?? column.width,
  }));

  const dataColumnCount = columnSchema.length + injected.length;

  return {
    columns,
    rowHeight: fitted.rowHeight,
    headerHeight: fitted.headerHeight,
    totalWidth: fitted.totalWidth,
    xOffsets: fitted.xOffsets,
    density: fitted.density as GridDensityProfile,
    mapping,
    columnSchema,
    dataColumnCount,
    actionColumn: dataColumnCount + 1,
    qualityColumn: columnSchema.length + 1,
    photoColumn: columnSchema.length + 2,
  };
}

export function specificCellFrame(
  layout: ReturnType<typeof buildSpecificMotorGridLayout>,
  cell: GridCellAddress,
) {
  const x = layout.xOffsets[cell.column] ?? 0;
  return {
    x,
    y: cell.row * layout.rowHeight,
    width: layout.columns[cell.column]?.width ?? 0,
    height: layout.rowHeight,
  };
}

export function specificSchemaColumnAt(layout: ReturnType<typeof buildSpecificMotorGridLayout>, column: number) {
  if (column <= 0 || column > layout.columnSchema.length) return null;
  return layout.columnSchema[column - 1] ?? null;
}

export function isSpecificSchemaColumnEditable(
  layout: ReturnType<typeof buildSpecificMotorGridLayout>,
  column: number,
): boolean {
  const def = layout.columns[column];
  if (!def || def.id === "rowNumber" || def.id === "action" || def.cellKind === "photo") {
    return false;
  }
  if (def.id === "quality" || def.modelField === SPECIFIC_QUALITY_KEY) {
    return true;
  }
  const col = specificSchemaColumnAt(layout, column);
  return col != null && col.editable !== false;
}

/** Photo cells accept Clear/Delete but never open the text editor. */
export function isSpecificSchemaColumnClearable(
  layout: ReturnType<typeof buildSpecificMotorGridLayout>,
  column: number,
): boolean {
  const def = layout.columns[column];
  if (def?.cellKind === "photo") return true;
  return isSpecificSchemaColumnEditable(layout, column);
}
