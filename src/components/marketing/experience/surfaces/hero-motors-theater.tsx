"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Download, Search } from "lucide-react";

import {
  buildFillOperations,
  resolveFillDragTarget,
} from "@/lib/grid/grid-fill-engine";
import {
  parseClipboardTsv,
  serializeRangeToTsv,
} from "@/lib/grid/excel-clipboard";
import {
  type GridCellAddress,
  type GridRange,
  isCellInsideRange,
  makeSingleCellRange,
  normalizeRange,
} from "@/lib/grid/grid-types";
import {
  clickSelection,
  dragSelection,
  type GridSelectionState,
  primaryRange,
} from "@/lib/grid/selection-controller";
import {
  formatKzt,
  landingDemoMotorsAtmosphere,
  landingDemoMotorsHero,
  landingDemoMotorsSale,
} from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";
import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { useLandingDemoSnapshot } from "@/components/marketing/modals/use-landing-demo-snapshot";

type HeroMotor = {
  id: string;
  brandName: string;
  engineCode: string;
  configuration: string;
  serialCode: string;
  transmission: string;
  quantity: number;
  location: string;
  status: "reserved" | "available";
  notes: string;
  reservedFor: string | null;
  lastAction: string;
  price?: number;
};

const HERO_COLUMN_DEFS = [
  { id: "row", editable: false, align: "center" as const },
  { id: "brand", editable: true, align: "start" as const },
  { id: "engine", editable: true, align: "start" as const },
  { id: "qty", editable: true, align: "center" as const },
  { id: "place", editable: true, align: "start" as const },
  { id: "reserve", editable: true, align: "start" as const },
  { id: "box", editable: true, align: "center" as const },
  { id: "status", editable: false, align: "start" as const },
  { id: "action", editable: false, align: "start" as const },
] as const;

const SALE_COLUMN_DEFS = [
  { id: "row", editable: false, align: "center" as const },
  { id: "brand", editable: true, align: "start" as const },
  { id: "engine", editable: true, align: "start" as const },
  { id: "qty", editable: true, align: "center" as const },
  { id: "place", editable: true, align: "start" as const },
  { id: "price", editable: false, align: "start" as const },
  { id: "box", editable: true, align: "center" as const },
  { id: "status", editable: false, align: "start" as const },
  { id: "sell", editable: false, align: "center" as const },
] as const;

type HeroColId = (typeof HERO_COLUMN_DEFS)[number]["id"];
type SaleColId = (typeof SALE_COLUMN_DEFS)[number]["id"];
type ColId = HeroColId | SaleColId;
type StatusFilter = "all" | "available" | "reserved";
type TheaterColumn = {
  id: ColId;
  label: string;
  editable: boolean;
  align: "start" | "center";
};

export type HeroMotorsTheaterProps = {
  className?: string;
  variant?: "hero" | "sale";
  sellLabel?: string;
  selectedId?: string;
  initialQuery?: string;
  /** Merge atmosphere motors for a dense working yard. */
  dense?: boolean;
  onSelectMotor?: (motorId: string) => void;
  onSell?: (motorId: string) => void;
};

function cloneHeroMotors(
  heroMotors: readonly (typeof landingDemoMotorsHero)[number][],
  atmosphereMotors: readonly (typeof landingDemoMotorsAtmosphere)[number][],
  dense = false,
): HeroMotor[] {
  const base: HeroMotor[] = heroMotors.map((motor) => ({
    id: motor.id,
    brandName: motor.brandName,
    engineCode: motor.engineCode,
    configuration: motor.configuration,
    serialCode: motor.serialCode,
    transmission: motor.transmission,
    quantity: motor.quantity,
    location: motor.location,
    status: motor.status,
    notes: motor.notes,
    reservedFor: motor.reservedFor,
    lastAction: motor.lastAction,
  }));
  if (!dense) return base;

  const seen = new Set(base.map((motor) => motor.serialCode));
  for (const [index, motor] of atmosphereMotors.entries()) {
    if (seen.has(motor.serialCode)) continue;
    seen.add(motor.serialCode);
    base.push({
      id: `atm-${motor.serialCode}-${index}`,
      brandName: motor.brandName,
      engineCode: motor.engineCode,
      configuration: motor.configuration,
      serialCode: motor.serialCode,
      transmission: motor.transmission,
      quantity: motor.quantity,
      location: motor.location,
      status: motor.status,
      notes: motor.notes,
      reservedFor: motor.reservedFor,
      lastAction: motor.lastAction,
    });
  }
  return base;
}

function cloneSaleMotors(
  saleMotors: readonly (typeof landingDemoMotorsSale)[number][],
): HeroMotor[] {
  return saleMotors.map((motor) => ({
    id: motor.id,
    brandName: motor.brandName,
    engineCode: motor.engineCode,
    configuration: motor.configuration,
    serialCode: motor.serialCode,
    transmission: motor.transmission,
    quantity: motor.quantity,
    location: motor.location,
    status: motor.status,
    notes: motor.notes,
    reservedFor: null,
    lastAction: "",
    price: motor.price,
  }));
}

function readCell(
  motor: HeroMotor,
  colId: ColId,
  rowIndex: number,
  statusText: (status: HeroMotor["status"]) => string,
): string {
  switch (colId) {
    case "row":
      return String(rowIndex + 1);
    case "brand":
      return motor.brandName;
    case "engine":
      return motor.engineCode;
    case "qty":
      return String(motor.quantity);
    case "place":
      return motor.location;
    case "reserve":
      return motor.reservedFor ?? "—";
    case "price":
      return motor.price != null ? `${formatKzt(motor.price)} ₸` : "";
    case "box":
      return motor.transmission;
    case "status":
      return statusText(motor.status);
    case "action":
      return motor.lastAction;
    case "sell":
      return "";
  }
}

function writeCell(motor: HeroMotor, colId: ColId, value: string): HeroMotor {
  const next = { ...motor };
  switch (colId) {
    case "brand":
      next.brandName = value;
      break;
    case "engine":
      next.engineCode = value;
      break;
    case "qty": {
      const parsed = Number(value.replace(",", "."));
      next.quantity = Number.isFinite(parsed) ? parsed : motor.quantity;
      break;
    }
    case "place":
      next.location = value;
      break;
    case "reserve":
      next.reservedFor = value.trim() === "" || value === "—" ? null : value;
      next.status = next.reservedFor ? "reserved" : "available";
      break;
    case "box":
      next.transmission = value;
      break;
    default:
      break;
  }
  return next;
}

/** Full Excel-grid product theater for the marketing hero / sale demo. */
export function HeroMotorsTheater({
  className,
  variant = "hero",
  sellLabel: sellLabelProp,
  selectedId,
  initialQuery,
  dense = false,
  onSelectMotor,
  onSell,
}: HeroMotorsTheaterProps) {
  const chrome = useDemoChrome();
  const {
    landingDemoMotorsHero: heroMotors,
    landingDemoMotorsAtmosphere: atmosphereMotors,
    landingDemoMotorsSale: saleMotors,
  } = useLandingDemoSnapshot();
  const sellLabel = sellLabelProp ?? chrome.sell;

  const columnLabel = useCallback(
    (id: ColId) => {
      if (id === "row" || id === "sell") return id === "row" ? "#" : "";
      const map: Partial<Record<ColId, string>> = {
        brand: chrome.columns.brand,
        engine: chrome.columns.engine,
        qty: chrome.columns.qty,
        place: chrome.columns.place,
        reserve: chrome.columns.reserve,
        price: chrome.columns.price,
        box: chrome.columns.box,
        status: chrome.columns.status,
        action: chrome.columns.action,
      };
      return map[id] ?? "";
    },
    [chrome.columns],
  );

  const columns = useMemo((): readonly TheaterColumn[] => {
    const defs = variant === "sale" ? SALE_COLUMN_DEFS : HERO_COLUMN_DEFS;
    return defs.map((def) => ({
      ...def,
      label: columnLabel(def.id),
    }));
  }, [variant, columnLabel]);

  const formatStatus = useCallback(
    (motorStatus: HeroMotor["status"]) => chrome.status.label(motorStatus),
    [chrome.status],
  );
  const placeCol = columns.findIndex((column) => column.id === "place");
  const editableCols = columns
    .map((column, index) => (column.editable ? index : -1))
    .filter((index) => index >= 0);

  const [query, setQuery] = useState(
    initialQuery ?? (variant === "sale" ? "" : "G4KC"),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const localizedSeed = useMemo(
    () =>
      variant === "sale"
        ? cloneSaleMotors(saleMotors)
        : cloneHeroMotors(heroMotors, atmosphereMotors, dense),
    [atmosphereMotors, dense, heroMotors, saleMotors, variant],
  );
  const [motors, setMotors] = useState<HeroMotor[]>(localizedSeed);
  useEffect(() => {
    setMotors(localizedSeed);
  }, [localizedSeed]);
  const [selection, setSelection] = useState<GridSelectionState>(() => ({
    anchor: { row: 0, column: Math.max(placeCol, 1) },
    head: { row: 0, column: Math.max(placeCol, 1) },
    cmdRanges: [],
  }));
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [editing, setEditing] = useState<GridCellAddress | null>(null);
  const [editValue, setEditValue] = useState("");
  const [fillPreview, setFillPreview] = useState<GridRange | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filling, setFilling] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const totalCount = motors.length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return motors.filter((motor) => {
      if (statusFilter !== "all" && motor.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        motor.brandName,
        motor.engineCode,
        motor.serialCode,
        motor.configuration,
        motor.location,
        motor.notes,
        motor.transmission,
        motor.reservedFor ?? "",
        formatStatus(motor.status),
        motor.lastAction,
        motor.price != null ? String(motor.price) : "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [motors, query, statusFilter, formatStatus]);

  const active = selection.head;
  const range = primaryRange(selection);

  useEffect(() => {
    setSelection((current) => {
      if (rows.length === 0) return current;
      const row = Math.min(current.head.row, rows.length - 1);
      return {
        anchor: { ...current.anchor, row: Math.min(current.anchor.row, rows.length - 1) },
        head: { ...current.head, row },
        cmdRanges: [],
      };
    });
  }, [rows.length]);

  useEffect(() => {
    if (!editing) return;
    editRef.current?.focus();
    editRef.current?.select();
  }, [editing]);

  const valueAt = useCallback(
    (row: number, column: number) => {
      const motor = rows[row];
      if (!motor) return "";
      return readCell(motor, columns[column].id, row, formatStatus);
    },
    [columns, rows, formatStatus],
  );

  const isEditableColumn = useCallback(
    (column: number) => columns[column]?.editable ?? false,
    [columns],
  );

  const applyWrites = useCallback(
    (writes: Array<{ row: number, column: number; value: string }>) => {
      if (writes.length === 0) return;
      setMotors((current) => {
        const next = current.map((motor) => ({ ...motor }));
        for (const write of writes) {
          const visible = rows[write.row];
          if (!visible) continue;
          const index = next.findIndex((motor) => motor.id === visible.id);
          if (index < 0) continue;
          const colId = columns[write.column]?.id;
          if (!colId || !columns[write.column].editable) continue;
          next[index] = writeCell(next[index], colId, write.value);
        }
        return next;
      });
    },
    [columns, rows],
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    applyWrites([{ row: editing.row, column: editing.column, value: editValue }]);
    setEditing(null);
    setEditValue("");
    gridRef.current?.focus({ preventScroll: true });
  }, [applyWrites, editValue, editing]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditValue("");
    gridRef.current?.focus({ preventScroll: true });
  }, []);

  const beginEdit = useCallback(
    (cell: GridCellAddress, seed?: string) => {
      if (!isEditableColumn(cell.column) || rows.length === 0) return;
      setSelection({ anchor: cell, head: cell, cmdRanges: [] });
      setEditing(cell);
      setEditValue(seed ?? valueAt(cell.row, cell.column));
    },
    [isEditableColumn, rows.length, valueAt],
  );

  const moveHead = useCallback(
    (row: number, column: number, extend: boolean) => {
      if (rows.length === 0) return;
      const next: GridCellAddress = {
        row: Math.max(0, Math.min(rows.length - 1, row)),
        column: Math.max(0, Math.min(columns.length - 1, column)),
      };
      setSelection((current) =>
        extend
          ? { ...current, head: next }
          : { anchor: next, head: next, cmdRanges: [] },
      );
    },
    [columns.length, rows.length],
  );

  const copySelection = useCallback(async () => {
    const text = serializeRangeToTsv(primaryRange(selectionRef.current), valueAt);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore clipboard denial in demo */
    }
  }, [valueAt]);

  const pasteSelection = useCallback(async () => {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    const matrix = parseClipboardTsv(text);
    if (matrix.length === 0) return;
    const sel = primaryRange(selectionRef.current);
    const writes: Array<{ row: number; column: number; value: string }> = [];
    for (let r = 0; r < matrix.length; r += 1) {
      for (let c = 0; c < matrix[r].length; c += 1) {
        const row = sel.minRow + r;
        const column = sel.minColumn + c;
        if (row >= rows.length || column >= columns.length) continue;
        if (!isEditableColumn(column)) continue;
        writes.push({ row, column, value: matrix[r][c] });
      }
    }
    applyWrites(writes);
  }, [applyWrites, isEditableColumn, rows.length]);

  const clearSelection = useCallback(() => {
    const sel = primaryRange(selectionRef.current);
    const writes: Array<{ row: number; column: number; value: string }> = [];
    for (let row = sel.minRow; row <= sel.maxRow; row += 1) {
      for (let column = sel.minColumn; column <= sel.maxColumn; column += 1) {
        if (!isEditableColumn(column)) continue;
        writes.push({ row, column, value: columns[column].id === "reserve" ? "—" : "" });
      }
    }
    applyWrites(writes);
  }, [applyWrites, isEditableColumn]);

  const fillDown = useCallback(() => {
    const sel = primaryRange(selectionRef.current);
    if (sel.maxRow <= sel.minRow) return;
    const writes: Array<{ row: number; column: number; value: string }> = [];
    for (let column = sel.minColumn; column <= sel.maxColumn; column += 1) {
      if (!isEditableColumn(column)) continue;
      const source = valueAt(sel.minRow, column);
      for (let row = sel.minRow + 1; row <= sel.maxRow; row += 1) {
        writes.push({ row, column, value: source });
      }
    }
    applyWrites(writes);
  }, [applyWrites, isEditableColumn, valueAt]);

  const fillRight = useCallback(() => {
    const sel = primaryRange(selectionRef.current);
    if (sel.maxColumn <= sel.minColumn) return;
    const writes: Array<{ row: number; column: number; value: string }> = [];
    for (let row = sel.minRow; row <= sel.maxRow; row += 1) {
      const sourceCol = editableCols.find((column) => column >= sel.minColumn) ?? sel.minColumn;
      if (!isEditableColumn(sourceCol)) continue;
      const source = valueAt(row, sourceCol);
      for (let column = sel.minColumn; column <= sel.maxColumn; column += 1) {
        if (!isEditableColumn(column) || column === sourceCol) continue;
        writes.push({ row, column, value: source });
      }
    }
    applyWrites(writes);
  }, [applyWrites, isEditableColumn, valueAt]);

  const exportCsv = useCallback(() => {
    const header = columns.map((column) => column.label).join(",");
    const lines = rows.map((motor, rowIndex) =>
      columns.map((column) => {
        const raw = readCell(motor, column.id, rowIndex, formatStatus);
        return `"${raw.replaceAll('"', '""')}"`;
      }).join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "autocore-motors-g4kc.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [columns, rows, formatStatus]);

  const onGridKeyDown = useCallback(
    async (event: KeyboardEvent<HTMLDivElement>) => {
      if (editing || rows.length === 0) return;
      const meta = event.metaKey || event.ctrlKey;
      const { row, column } = selectionRef.current.head;

      if (meta && event.key.toLowerCase() === "c") {
        event.preventDefault();
        await copySelection();
        return;
      }
      if (meta && event.key.toLowerCase() === "v") {
        event.preventDefault();
        await pasteSelection();
        return;
      }
      if (meta && event.key.toLowerCase() === "x") {
        event.preventDefault();
        await copySelection();
        clearSelection();
        return;
      }
      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        fillDown();
        return;
      }
      if (meta && event.key.toLowerCase() === "r") {
        event.preventDefault();
        fillRight();
        return;
      }
      if (meta && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelection({
          anchor: { row: 0, column: 1 },
          head: { row: rows.length - 1, column: columns.length - 1 },
          cmdRanges: [],
        });
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveHead(row + 1, column, event.shiftKey);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveHead(row - 1, column, event.shiftKey);
          break;
        case "ArrowRight":
          event.preventDefault();
          moveHead(row, column + 1, event.shiftKey);
          break;
        case "ArrowLeft":
          event.preventDefault();
          moveHead(row, column - 1, event.shiftKey);
          break;
        case "Tab":
          event.preventDefault();
          moveHead(row, column + (event.shiftKey ? -1 : 1), false);
          break;
        case "Home":
          event.preventDefault();
          moveHead(row, event.ctrlKey || event.metaKey ? 0 : 1, event.shiftKey);
          break;
        case "End":
          event.preventDefault();
          moveHead(
            row,
            event.ctrlKey || event.metaKey ? columns.length - 1 : columns.length - 1,
            event.shiftKey,
          );
          break;
        case "Enter":
          event.preventDefault();
          if (event.shiftKey) moveHead(row - 1, column, false);
          else if (isEditableColumn(column)) beginEdit({ row, column });
          else moveHead(row + 1, column, false);
          break;
        case "F2":
          event.preventDefault();
          beginEdit({ row, column });
          break;
        case "Backspace":
        case "Delete":
          event.preventDefault();
          clearSelection();
          break;
        case "Escape":
          event.preventDefault();
          setSelection((current) => ({
            anchor: current.head,
            head: current.head,
            cmdRanges: [],
          }));
          break;
        default:
          if (
            !meta &&
            !event.altKey &&
            event.key.length === 1 &&
            isEditableColumn(column)
          ) {
            event.preventDefault();
            beginEdit({ row, column }, event.key);
          }
          break;
      }
    },
    [
      beginEdit,
      clearSelection,
      copySelection,
      editing,
      fillDown,
      fillRight,
      isEditableColumn,
      moveHead,
      pasteSelection,
      rows.length,
    ],
  );

  const onCellPointerDown = useCallback(
    (event: ReactPointerEvent, row: number, column: number) => {
      if (editing) commitEdit();
      event.preventDefault();
      const cell = { row, column };
      setSelection((current) =>
        clickSelection(current, cell, {
          shift: event.shiftKey,
          meta: event.metaKey || event.ctrlKey,
        }),
      );
      const motor = rows[row];
      if (motor) onSelectMotor?.(motor.id);
      setDragging(true);
      gridRef.current?.focus({ preventScroll: true });
    },
    [commitEdit, editing, onSelectMotor, rows],
  );

  const onCellPointerEnter = useCallback(
    (row: number, column: number) => {
      setHoverRow(row);
      if (dragging) {
        setSelection((current) => dragSelection(current, { row, column }));
      }
      if (filling) {
        const source = primaryRange(selectionRef.current);
        setFillPreview(resolveFillDragTarget(source, { row, column }));
      }
    },
    [dragging, filling],
  );

  useEffect(() => {
    if (!dragging && !filling) return;
    const onUp = () => {
      if (filling && fillPreview) {
        const source = primaryRange(selectionRef.current);
        const ops = buildFillOperations({
          source,
          target: fillPreview,
          valueAt: (cell) => valueAt(cell.row, cell.column),
          isEditableColumn,
          isDateColumn: () => false,
        });
        applyWrites(ops.map((op) => ({ row: op.cell.row, column: op.cell.column, value: op.value })));
        setSelection({
          anchor: { row: fillPreview.minRow, column: fillPreview.minColumn },
          head: { row: fillPreview.maxRow, column: fillPreview.maxColumn },
          cmdRanges: [],
        });
      }
      setDragging(false);
      setFilling(false);
      setFillPreview(null);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [applyWrites, dragging, fillPreview, filling, isEditableColumn, valueAt]);

  const onFillPointerDown = useCallback((event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setFilling(true);
    setFillPreview(primaryRange(selectionRef.current));
  }, []);

  const onFillDoubleClick = useCallback(() => {
    const sel = primaryRange(selectionRef.current);
    const target: GridRange = {
      ...sel,
      maxRow: Math.max(sel.maxRow, rows.length - 1),
    };
    const ops = buildFillOperations({
      source: makeSingleCellRange(selectionRef.current.head),
      target,
      valueAt: (cell) => valueAt(cell.row, cell.column),
      isEditableColumn,
      isDateColumn: () => false,
    });
    applyWrites(ops.map((op) => ({ row: op.cell.row, column: op.cell.column, value: op.value })));
  }, [applyWrites, isEditableColumn, rows.length, valueAt]);

  const highlightRange = fillPreview ?? range;

  return (
    <div className={cn("exp-hero-theater", variant === "sale" && "is-sale", className)}>
      <div className="exp-hero-theater-scale">
        <div className={cn("exp-hero-excel", variant === "sale" && "is-sale")}>
          <div className="exp-hero-excel-toolbar">
            <label className="exp-hero-excel-search">
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder={variant === "sale" ? chrome.filters.search : undefined}
                aria-label={chrome.filters.searchMotors}
                className="exp-hero-excel-search-input"
              />
              <span className="exp-hero-excel-count">
                {chrome.filters.countOf(rows.length, totalCount)}
              </span>
            </label>

            <div className="exp-hero-excel-toolbar-actions">
              <div
                className="exp-hero-excel-filter-group"
                role="group"
                aria-label={chrome.filters.statusFilterAria}
              >
                {(
                  [
                    ["all", chrome.filters.all],
                    ["available", chrome.filters.inStock],
                    ["reserved", chrome.filters.reserved],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "exp-hero-excel-tool-btn exp-hero-excel-filter-chip",
                      statusFilter === value && "is-active",
                    )}
                    aria-pressed={statusFilter === value}
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button type="button" className="exp-hero-excel-tool-btn is-export" onClick={exportCsv}>
                <Download className="size-3.5" aria-hidden />
                {chrome.filters.export}
              </button>
            </div>
          </div>

          <div
            ref={gridRef}
            className="exp-hero-excel-grid"
            tabIndex={0}
            role="grid"
            aria-label={chrome.grid.ariaLabel}
            aria-multiselectable="true"
            onKeyDown={onGridKeyDown}
          >
            <div className="exp-hero-excel-header" role="row">
              {columns.map((column) => (
                <div
                  key={column.id}
                  role="columnheader"
                  className={cn(
                    "exp-hero-excel-th",
                    column.align === "center" && "exp-hero-excel-cell-center",
                    column.id === "row" && "exp-hero-excel-rownum",
                  )}
                >
                  {column.label}
                </div>
              ))}
            </div>

            <div className="exp-hero-excel-body">
              {rows.length === 0 ? (
                <div className="exp-hero-excel-empty">{chrome.filters.empty}</div>
              ) : (
                rows.map((motor, rowIndex) => (
                  <div
                    key={motor.id}
                    role="row"
                    className={cn(
                      "exp-hero-excel-row",
                      hoverRow === rowIndex && "is-hover",
                      active.row === rowIndex && "is-active-row",
                      selectedId === motor.id && "is-selected-row",
                    )}
                    onPointerLeave={() => setHoverRow(null)}
                  >
                    {columns.map((column, colIndex) => {
                      const cell = { row: rowIndex, column: colIndex };
                      const isActive =
                        active.row === rowIndex && active.column === colIndex;
                      const inRange = isCellInsideRange(cell, highlightRange);
                      const isEditingCell =
                        editing?.row === rowIndex && editing.column === colIndex;
                      const value = readCell(motor, column.id, rowIndex, formatStatus);

                      return (
                        <div
                          key={column.id}
                          role="gridcell"
                          tabIndex={-1}
                          aria-selected={isActive || inRange}
                          className={cn(
                            "exp-hero-excel-td",
                            column.align === "center" && "exp-hero-excel-cell-center",
                            column.id === "row" && "exp-hero-excel-rownum",
                            (column.id === "qty" || column.id === "price") && "exp-mock-mono",
                            column.id === "place" && "is-emphasis",
                            inRange && "is-range-cell",
                            isActive && "is-active-cell",
                            fillPreview && inRange && "is-fill-preview",
                          )}
                          onPointerDown={(event) => onCellPointerDown(event, rowIndex, colIndex)}
                          onPointerEnter={() => onCellPointerEnter(rowIndex, colIndex)}
                          onDoubleClick={() => {
                            if (column.id !== "sell") beginEdit(cell);
                          }}
                        >
                          {isEditingCell ? (
                            <input
                              ref={editRef}
                              className="exp-hero-excel-editor"
                              value={editValue}
                              onChange={(event) => setEditValue(event.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  commitEdit();
                                  moveHead(rowIndex + 1, colIndex, false);
                                } else if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelEdit();
                                } else if (event.key === "Tab") {
                                  event.preventDefault();
                                  commitEdit();
                                  moveHead(rowIndex, colIndex + (event.shiftKey ? -1 : 1), false);
                                }
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                            />
                          ) : column.id === "sell" ? (
                            <button
                              type="button"
                              className="exp-hero-excel-sell"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectMotor?.(motor.id);
                                onSell?.(motor.id);
                              }}
                            >
                              {sellLabel}
                            </button>
                          ) : column.id === "status" ? (
                            <span className="exp-hero-excel-status">
                              <span
                                className={cn(
                                  "exp-hero-excel-status-dot",
                                  motor.status === "reserved"
                                    ? "is-reserved"
                                    : "is-available",
                                )}
                                aria-hidden
                              />
                              {value}
                            </span>
                          ) : (
                            value
                          )}
                          {isActive && !isEditingCell && column.id !== "sell" ? (
                            <span
                              className="exp-hero-excel-fill"
                              aria-hidden
                              onPointerDown={onFillPointerDown}
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onFillDoubleClick();
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
