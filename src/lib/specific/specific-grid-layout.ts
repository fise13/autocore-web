import { SpecificColumnDef } from "@/domain/specific-category";
import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  MOTOR_GRID_COLUMN_WIDTHS,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
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

function columnAlign(column: SpecificColumnDef, index: number): "left" | "center" {
  if (column.kind === "canonical") {
    if (column.slotIndex === 3 || (column.slotIndex != null && column.slotIndex >= 5)) {
      return "center";
    }
  }
  return index === 3 ? "center" : "left";
}

export function buildSpecificMotorGridLayout(columnSchema: SpecificColumnDef[], zoom: number) {
  const mapping: SpecificHeaderMapping = schemaToHeaderMapping(columnSchema);
  const qualityTitle = userCopy.motors.grid.columns.quality;
  const photoTitle = userCopy.motors.grid.columns.photo;

  const schemaColumns: GridColumnDefinition[] = columnSchema.map((column, index) => ({
    id: columnGridId(column, index),
    title: column.title,
    width: scaleMotorGridDimension(columnWidth(column, index), zoom),
    editable: column.editable !== false,
    align: columnAlign(column, index),
    modelField: column.key,
  }));

  const injected: GridColumnDefinition[] = [
    {
      id: "quality",
      title: qualityTitle,
      width: scaleMotorGridDimension(MOTOR_GRID_COLUMN_WIDTHS.quality, zoom),
      editable: true,
      modelField: SPECIFIC_QUALITY_KEY,
    },
    {
      id: "photo",
      title: photoTitle,
      width: scaleMotorGridDimension(MOTOR_GRID_COLUMN_WIDTHS.photo, zoom),
      editable: false,
      align: "center",
      modelField: SPECIFIC_PHOTO_URLS_KEY,
      cellKind: "photo",
    },
  ];

  const columns: GridColumnDefinition[] = [
    {
      id: "rowNumber",
      title: "#",
      width: scaleMotorGridDimension(MOTOR_GRID_COLUMN_WIDTHS.rowNumber, zoom),
      editable: false,
      align: "center",
    },
    ...schemaColumns,
    ...injected,
    {
      id: "action",
      title: "",
      width: scaleMotorGridDimension(MOTOR_GRID_COLUMN_WIDTHS.action, zoom),
      editable: false,
      align: "center" as const,
    },
  ];

  const rowHeight = scaleMotorGridDimension(MOTOR_GRID_BASE_ROW_HEIGHT, zoom);
  const headerHeight = scaleMotorGridDimension(MOTOR_GRID_BASE_HEADER_HEIGHT, zoom);
  const xOffsets: number[] = [];
  let cursor = 0;
  for (const column of columns) {
    xOffsets.push(cursor);
    cursor += column.width;
  }

  const dataColumnCount = columnSchema.length + injected.length;

  return {
    columns,
    rowHeight,
    headerHeight,
    totalWidth: cursor,
    xOffsets,
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
