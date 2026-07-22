"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Search } from "lucide-react";

import { cellFrame, type GridLayoutMetrics } from "@/lib/grid/grid-layout-engine";
import { gridPalette } from "@/lib/grid/grid-palette";
import type { GridColumnDefinition } from "@/lib/grid/grid-types";
import { isCellInsideRange } from "@/lib/grid/grid-types";
import {
  clickSelection,
  type GridSelectionState,
  primaryRange,
} from "@/lib/grid/selection-controller";
import { formatMotorDate } from "@/lib/motor-dates";
import {
  formatKzt,
  landingDemoMotorsSale,
  type LandingSaleMotor,
} from "@/lib/marketing/landing-demo-snapshot";
import { scaleMotorGridDimension } from "@/lib/motor-grid-layout";
import { cn } from "@/lib/utils";

const EMPTY_PAD = 22;
const EMPTY_PAD_COMPACT = 1;
const ARRIVAL = new Date("2026-02-01");
const ZOOM = 1;

const SALE_COLUMN_BASE: Array<
  Omit<GridColumnDefinition, "width"> & { width: number; flex?: number }
> = [
  { id: "rowNumber", title: "#", width: 44, editable: false, align: "center", flex: 0 },
  { id: "brandName", title: "Бренд", width: 120, editable: false, align: "left", flex: 1.1 },
  { id: "engineCode", title: "Двигатель", width: 110, editable: false, align: "left", flex: 1 },
  { id: "serialCode", title: "Номер двигателя", width: 160, editable: false, align: "left", flex: 1.45 },
  { id: "quantity", title: "Кол-во", width: 72, editable: false, align: "center", flex: 0 },
  { id: "warehouseLocation", title: "Место", width: 96, editable: false, align: "left", flex: 0.85 },
  { id: "notes", title: "Цена", width: 120, editable: false, align: "left", flex: 1.05 },
  { id: "transmission", title: "Коробка", width: 96, editable: false, align: "center", flex: 0.8 },
  { id: "configuration", title: "Статус", width: 112, editable: false, align: "left", flex: 1 },
  { id: "arrivalDate", title: "Дата прихода", width: 118, editable: false, align: "center", flex: 1 },
  { id: "action", title: "", width: 110, editable: false, align: "center", flex: 0 },
];

/** Stretch columns to fill the viewport — no empty dead zone on the right. */
function buildSaleLayout(containerWidth: number, compact = false): GridLayoutMetrics {
  const zoom = compact ? 0.92 : ZOOM;
  const base = SALE_COLUMN_BASE.map((column) => ({
    ...column,
    width: scaleMotorGridDimension(column.width, zoom),
  }));

  const baseTotal = base.reduce((sum, column) => sum + column.width, 0);
  const target = Math.max(containerWidth, baseTotal);
  const extra = Math.max(0, target - baseTotal);
  const flexTotal = base.reduce((sum, column) => sum + (column.flex ?? 0), 0);

  let usedExtra = 0;
  const columns = base.map((column, index) => {
    const flex = column.flex ?? 0;
    let add = 0;
    if (extra > 0 && flexTotal > 0 && flex > 0) {
      if (index === base.length - 1) {
        add = extra - usedExtra;
      } else {
        add = Math.floor((extra * flex) / flexTotal);
        usedExtra += add;
      }
    }
    const { flex: _flex, ...rest } = column;
    return { ...rest, width: column.width + add };
  });

  const widthSum = columns.reduce((sum, column) => sum + column.width, 0);
  if (widthSum < target) {
    const growIndex = [...columns.keys()].reverse().find((i) => (base[i].flex ?? 0) > 0) ?? columns.length - 1;
    columns[growIndex] = {
      ...columns[growIndex],
      width: columns[growIndex].width + (target - widthSum),
    };
  }

  const rowHeight = scaleMotorGridDimension(compact ? 28 : 32, zoom);
  const headerHeight = scaleMotorGridDimension(compact ? 26 : 30, zoom);
  const xOffsets: number[] = [];
  let cursor = 0;
  for (const column of columns) {
    xOffsets.push(cursor);
    cursor += column.width;
  }
  return { columns, rowHeight, headerHeight, totalWidth: cursor, xOffsets };
}

type SaleMotorsExcelProps = {
  selectedId: string;
  sellLabel: string;
  onSelect: (motor: LandingSaleMotor) => void;
  onSell: (motor: LandingSaleMotor) => void;
  /** Fit height to rows — no empty spreadsheet pad. */
  compact?: boolean;
};

export function SaleMotorsExcel({
  selectedId,
  sellLabel,
  onSelect,
  onSell,
  compact = false,
}: SaleMotorsExcelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const layout = useMemo(
    () => buildSaleLayout(viewportWidth, compact),
    [viewportWidth, compact],
  );
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<GridSelectionState>(() => ({
    anchor: { row: 0, column: 5 },
    head: { row: 0, column: 5 },
    cmdRanges: [],
  }));

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const update = () => {
      const next = Math.max(640, Math.floor(node.clientWidth));
      setViewportWidth((current) => (current === next ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...landingDemoMotorsSale];
    return landingDemoMotorsSale.filter((motor) =>
      [
        motor.brandName,
        motor.engineCode,
        motor.serialCode,
        motor.location,
        motor.transmission,
        String(motor.price),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const displayRows = rows.length;
  const sheetRows = displayRows + (compact ? EMPTY_PAD_COMPACT : EMPTY_PAD);

  function cellValue(rowIdx: number, columnId: string): string {
    const motor = rows[rowIdx];
    if (!motor) return "";
    switch (columnId) {
      case "rowNumber":
        return String(rowIdx + 1);
      case "brandName":
        return motor.brandName;
      case "engineCode":
        return motor.engineCode;
      case "serialCode":
        return motor.serialCode;
      case "quantity":
        return String(motor.quantity);
      case "warehouseLocation":
        return motor.location;
      case "notes":
        return `${formatKzt(motor.price)} ₸`;
      case "transmission":
        return motor.transmission;
      case "configuration":
        return "В наличии";
      case "arrivalDate":
        return formatMotorDate(ARRIVAL);
      default:
        return "";
    }
  }

  function exportCsv() {
    const header = layout.columns
      .filter((column) => column.id !== "action")
      .map((column) => column.title)
      .join(",");
    const body = rows
      .map((_, index) =>
        layout.columns
          .filter((column) => column.id !== "action")
          .map((column) => `"${cellValue(index, column.id).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "autocore-motors-demo.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn("exp-sale-excel", compact && "is-compact")}>
      <div className="exp-sale-excel-toolbar">
        <label className="exp-sale-excel-search">
          <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="Поиск…"
            aria-label="Поиск по двигателям"
            className="exp-sale-excel-search-input"
          />
          <span className="exp-sale-excel-count">
            {displayRows} из {landingDemoMotorsSale.length}
          </span>
        </label>

        <div className="exp-sale-excel-toolbar-actions">
          <div className="exp-hero-excel-filter-group" role="group" aria-label="Фильтр статуса">
            <button
              type="button"
              className="exp-sale-excel-tool-btn exp-hero-excel-filter-chip is-active"
              aria-pressed
            >
              В наличии
            </button>
          </div>
          <button type="button" className="exp-sale-excel-tool-btn is-export" onClick={exportCsv}>
            <Download className="size-3.5" aria-hidden />
            Экспорт
          </button>
        </div>
      </div>

      <div
        ref={rootRef}
        tabIndex={0}
        className="exp-sale-excel-viewport excel-grid-scroll outline-none"
        role="grid"
        aria-label="Склад двигателей · Excel"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            const motor = rows[selection.head.row];
            if (motor) {
              event.preventDefault();
              onSell(motor);
            }
          }
        }}
      >
        <div
          className="relative antialiased bg-card"
          style={{
            width: layout.totalWidth,
            height: layout.headerHeight + sheetRows * layout.rowHeight,
            fontSize: 13,
          }}
        >
          <div
            className="sticky top-0 z-10 border-b bg-muted"
            style={{ height: layout.headerHeight }}
          >
            {layout.columns.map((column, colIdx) => (
              <div
                key={column.id}
                className={cn(
                  "absolute top-0 flex border-r px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                  column.align === "center"
                    ? "items-center justify-center"
                    : "items-center justify-start",
                )}
                style={{
                  left: layout.xOffsets[colIdx],
                  width: column.width,
                  height: layout.headerHeight,
                }}
              >
                {column.title}
              </div>
            ))}
          </div>

          <div className="absolute left-0 right-0" style={{ top: layout.headerHeight }}>
            {Array.from({ length: sheetRows }, (_, rowIdx) => {
              const motor = rows[rowIdx];
              const isData = Boolean(motor);
              const rowSelected = isData && motor!.id === selectedId;

              return (
                <div key={motor?.id ?? `empty-${rowIdx}`} style={{ height: layout.rowHeight }}>
                  {layout.columns.map((column, colIdx) => {
                    const selected =
                      rowSelected ||
                      isCellInsideRange({ row: rowIdx, column: colIdx }, primaryRange(selection));
                    const focused =
                      selection.head.row === rowIdx && selection.head.column === colIdx;
                    const cell = cellFrame(layout, { row: rowIdx, column: colIdx });

                    return (
                      <div
                        key={`${rowIdx}-${column.id}`}
                        role="gridcell"
                        className={cn(
                          "absolute flex border-r border-b px-2.5 text-[13px] leading-[1.35] whitespace-nowrap",
                          column.align === "center"
                            ? "items-center justify-center"
                            : "items-center justify-start",
                          selected && "bg-emerald-500/12",
                          focused && "z-[2]",
                        )}
                        style={{
                          left: cell.x,
                          top: cell.y,
                          width: cell.width,
                          height: cell.height,
                          ...(selected ? { backgroundColor: gridPalette.selectionFill } : {}),
                          ...(focused
                            ? { boxShadow: `inset 0 0 0 2px ${gridPalette.activeBorder}` }
                            : {}),
                        }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          rootRef.current?.focus({ preventScroll: true });
                          const next = clickSelection(
                            selection,
                            { row: rowIdx, column: colIdx },
                            {
                              shift: event.shiftKey,
                              meta: event.metaKey || event.ctrlKey,
                            },
                          );
                          setSelection(next);
                          if (motor) onSelect(motor);
                        }}
                      >
                        {column.id === "action" ? (
                          isData ? (
                            <button
                              type="button"
                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelect(motor!);
                                onSell(motor!);
                              }}
                            >
                              {sellLabel}
                            </button>
                          ) : null
                        ) : column.id === "configuration" && isData ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                            {cellValue(rowIdx, column.id)}
                          </span>
                        ) : (
                          <span className="truncate">{cellValue(rowIdx, column.id)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
