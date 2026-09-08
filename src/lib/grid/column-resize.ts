import { buildOffsetMetrics } from "@/lib/grid/grid-density";

export const MIN_EXCEL_COLUMN_WIDTH = 50;
export const MAX_EXCEL_COLUMN_WIDTH = 1400;

type LayoutWithColumns<TColumn extends { id: string; width: number }> = {
  columns: TColumn[];
  xOffsets: number[];
  totalWidth: number;
};

export function clampExcelColumnWidth(
  width: number,
  minWidth = MIN_EXCEL_COLUMN_WIDTH,
  maxWidth = MAX_EXCEL_COLUMN_WIDTH,
): number {
  const max = Number.isFinite(maxWidth) ? maxWidth : MAX_EXCEL_COLUMN_WIDTH;
  return Math.min(max, Math.max(minWidth, Math.round(width)));
}

/** Replaces fitted widths with user overrides and rebuilds header/cell offsets. */
export function applyColumnWidthOverrides<
  TColumn extends { id: string; width: number },
  TLayout extends LayoutWithColumns<TColumn>,
>(layout: TLayout, overrides: Readonly<Record<string, number>>, minWidth = MIN_EXCEL_COLUMN_WIDTH): TLayout {
  if (Object.keys(overrides).length === 0) return layout;

  let changed = false;
  const columns = layout.columns.map((column) => {
    const override = overrides[column.id];
    if (override == null) return column;
    const width = clampExcelColumnWidth(override, minWidth);
    if (width === column.width) return column;
    changed = true;
    return { ...column, width };
  });

  if (!changed) return layout;

  const { xOffsets, totalWidth } = buildOffsetMetrics(columns.map((column) => column.width));
  return { ...layout, columns, xOffsets, totalWidth };
}
