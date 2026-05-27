import {
  MOTOR_GRID_BASE_HEADER_HEIGHT,
  MOTOR_GRID_BASE_ROW_HEIGHT,
  MOTOR_GRID_COLUMN_WIDTHS,
  scaleMotorGridDimension,
} from "@/lib/motor-grid-layout";
import { GridCellAddress, GridColumnDefinition } from "@/lib/grid/grid-types";
import {
  buildSpecificHeaderMapping,
  specificSlotTitle,
  SpecificHeaderMapping,
} from "@/lib/specific/specific-header-mapping";
import { SpecificRecordEntity } from "@/infrastructure/firestore/specific-category-repository";

const SLOT_COLUMN_IDS = [
  "serialCode",
  "configuration",
  "notes",
  "quantity",
  "transmission",
  "arrivalDate",
  "soldDate",
] as const;

export function buildSpecificMotorGridLayout(
  records: SpecificRecordEntity[],
  zoom: number,
  mapping: SpecificHeaderMapping = buildSpecificHeaderMapping(records),
) {
  const columns: GridColumnDefinition[] = [
    {
      id: "rowNumber",
      title: "#",
      width: scaleMotorGridDimension(MOTOR_GRID_COLUMN_WIDTHS.rowNumber, zoom),
      editable: false,
      align: "center",
    },
    ...Array.from({ length: 7 }, (_, slotIndex) => ({
      id: SLOT_COLUMN_IDS[slotIndex],
      title: specificSlotTitle(mapping, slotIndex),
      width: scaleMotorGridDimension(
        slotIndex === 0
          ? MOTOR_GRID_COLUMN_WIDTHS.serialCode
          : slotIndex === 1
            ? MOTOR_GRID_COLUMN_WIDTHS.configuration
            : slotIndex === 2
              ? MOTOR_GRID_COLUMN_WIDTHS.notes
              : slotIndex === 3
                ? MOTOR_GRID_COLUMN_WIDTHS.quantity
                : slotIndex === 4
                  ? MOTOR_GRID_COLUMN_WIDTHS.transmission
                  : slotIndex === 5
                    ? MOTOR_GRID_COLUMN_WIDTHS.arrivalDate
                    : MOTOR_GRID_COLUMN_WIDTHS.soldDate,
        zoom,
      ),
      editable: slotIndex !== 6,
      align: slotIndex === 3 || slotIndex >= 5 ? ("center" as const) : ("left" as const),
      modelField: mapping.slotKeys[slotIndex] ?? SLOT_COLUMN_IDS[slotIndex],
    })),
    {
      id: "action",
      title: "",
      width: scaleMotorGridDimension(MOTOR_GRID_COLUMN_WIDTHS.action, zoom),
      editable: false,
      align: "center",
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
