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

  const columns: GridColumnDefinition[] = [
    {
      id: "rowNumber",
      title: "#",
      width: scaleMotorGridDimension(MOTOR_GRID_COLUMN_WIDTHS.rowNumber, zoom),
      editable: false,
      align: "center",
    },
    ...columnSchema.map((column, index) => ({
      id: columnGridId(column, index),
      title: column.title,
      width: scaleMotorGridDimension(columnWidth(column, index), zoom),
      editable: column.editable !== false,
      align: columnAlign(column, index),
      modelField: column.key,
    })),
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

  return {
    columns,
    rowHeight,
    headerHeight,
    totalWidth: cursor,
    xOffsets,
    mapping,
    columnSchema,
    dataColumnCount: columnSchema.length,
    actionColumn: columnSchema.length + 1,
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
  if (column <= 0 || column > layout.dataColumnCount) return null;
  return layout.columnSchema[column - 1] ?? null;
}

export function isSpecificSchemaColumnEditable(
  layout: ReturnType<typeof buildSpecificMotorGridLayout>,
  column: number,
): boolean {
  const col = specificSchemaColumnAt(layout, column);
  return col != null && col.editable !== false;
}
