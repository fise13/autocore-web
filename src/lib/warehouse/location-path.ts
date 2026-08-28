import {
  buildLocationDisplayCode,
  normalizeLocationCode,
  type WarehouseLocationType,
} from "@/domain/warehouse-location";

/**
 * Turn free-text warehouse places into a path of nested boxes.
 *
 * Spreadsheets write a place as one cell ("СКЛАД А / КОРОБКА 12") or as a
 * stack of section headings (a warehouse, then a rack, then a box). The rest
 * of AutoCore stores that as `warehouseLocations` nodes with `parentId`.
 * This file is the pure half: split, classify, stack. Nothing here writes.
 */

/** Explicit nesting in a cell — "СКЛАД / КОРОБКА 1 / КОРОБКА 2". */
const PATH_SEPARATOR = /\s*(?:[/|\\]|→|>)+\s*/;

const WAREHOUSE_RE = /(склад|warehouse|двор|yard|филиал|\bbranch\b|zone|зона)/i;
const RACK_RE = /(стеллаж|стелаж|\brack\b)/i;
const SHELF_RE = /(полк[аиеу]|\bshelf\b)/i;
const BOX_RE = /(коробк|ящик|ячейк|контейнер|\bbox\b|\bbin\b|\btote\b)/i;

/** Short structured codes like A-03-12 (zone-rack-shelf), never engine serials. */
const STRUCTURED_SEGMENT = /^[A-Z0-9]{1,4}$/i;

export type LocationHeadingClass = "warehouse" | "rack" | "shelf" | "box";

const CLASS_DEPTH: Record<LocationHeadingClass, number> = {
  warehouse: 0,
  rack: 1,
  shelf: 2,
  box: 3,
};

const TYPE_BY_CLASS: Record<LocationHeadingClass, WarehouseLocationType> = {
  warehouse: "zone",
  rack: "rack",
  shelf: "shelf",
  box: "bin",
};

export function foldLocationSegment(value: string): string {
  return normalizeLocationCode(value).toLowerCase();
}

export function classifyLocationHeading(value: string): LocationHeadingClass | null {
  const text = value.trim();
  if (!text) return null;
  if (WAREHOUSE_RE.test(text)) return "warehouse";
  if (RACK_RE.test(text)) return "rack";
  if (SHELF_RE.test(text)) return "shelf";
  if (BOX_RE.test(text)) return "box";
  return null;
}

export function isLocationHeading(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return splitLocationPath(value).some((segment) => classifyLocationHeading(segment) != null);
}

/**
 * Split a cell or heading into nested segments.
 *
 * Slash-style paths always nest. Hyphenated codes nest only when every piece
 * looks like a warehouse coordinate ("A-03-12"), so an engine serial or
 * "КОРОБКА-12" stays one leaf.
 */
export function splitLocationPath(raw: string | null | undefined): string[] {
  const text = normalizeLocationCode(raw ?? "");
  if (!text) return [];

  if (PATH_SEPARATOR.test(text)) {
    return uniqueSegments(text.split(PATH_SEPARATOR));
  }

  const hyphen = text.split("-").map((part) => part.trim()).filter(Boolean);
  if (
    hyphen.length >= 2 &&
    hyphen.length <= 4 &&
    hyphen.every((part) => STRUCTURED_SEGMENT.test(part))
  ) {
    return uniqueSegments(hyphen);
  }

  return [text];
}

export function joinLocationPath(segments: readonly string[]): string {
  return buildLocationDisplayCode(segments.map((segment) => normalizeLocationCode(segment)));
}

export function inferLocationType(
  segment: string,
  index: number,
  total: number,
): WarehouseLocationType {
  const classified = classifyLocationHeading(segment);
  if (classified) return TYPE_BY_CLASS[classified];
  if (total <= 1) return "custom";
  if (index === 0) return "zone";
  if (index === total - 1) return "bin";
  if (index === 1) return "rack";
  return "shelf";
}

/**
 * Fold a new section heading into the location stack.
 *
 * A warehouse heading starts a new tree. A deeper class (rack → shelf → box)
 * nests under what is already open. The same class at the same depth is a
 * sibling — "КОРОБКА 1" then "КОРОБКА 2" under one warehouse, not a box
 * inside a box. Nested boxes of the same class use an explicit path
 * ("КОРОБКА 1 / КОРОБКА 2") in the heading or the cell.
 */
export function pushLocationHeading(
  stack: readonly string[],
  heading: string | null | undefined,
): string[] {
  const incoming = splitLocationPath(heading);
  if (incoming.length === 0) return [...stack];
  if (!incoming.some((segment) => classifyLocationHeading(segment))) {
    return [...stack];
  }

  const incomingClass = classifyLocationHeading(incoming[0]!);
  if (incoming.length > 1 || incomingClass === "warehouse") {
    return incoming;
  }

  const warehouseEnd = lastIndexOfClass(stack, "warehouse");
  const prefix = warehouseEnd >= 0 ? stack.slice(0, warehouseEnd + 1) : [];
  const tail = warehouseEnd >= 0 ? stack.slice(warehouseEnd + 1) : [...stack];

  const last = tail[tail.length - 1];
  const lastClass = last ? classifyLocationHeading(last) : null;
  const nextClass = incomingClass;
  const lastDepth = lastClass ? CLASS_DEPTH[lastClass] : -1;
  const nextDepth = nextClass ? CLASS_DEPTH[nextClass] : lastDepth + 1;

  if (tail.length === 0) return [...prefix, ...incoming];
  if (nextDepth > lastDepth) return [...prefix, ...tail, ...incoming];
  if (nextClass && lastClass && nextClass === lastClass) {
    return [...prefix, ...tail.slice(0, -1), ...incoming];
  }
  if (nextDepth === lastDepth) {
    return [...prefix, ...tail.slice(0, -1), ...incoming];
  }
  return [...prefix, ...incoming];
}

/**
 * Combine a section stack with what the row itself wrote.
 *
 * A cell that already names a warehouse is the whole path. A cell that names
 * only a box hangs off the section. A missing cell keeps the section.
 */
export function resolveImportLocationPath(input: {
  cellLocation?: string | null;
  cellWarehouse?: string | null;
  sectionPath?: readonly string[] | null;
  section?: string | null;
}): string[] {
  const cell = splitLocationPath(input.cellLocation || input.cellWarehouse || "");
  const fromSection = sectionPathFrom(input.sectionPath, input.section);

  if (cell.length === 0) return fromSection;
  if (fromSection.length === 0) return cell;
  if (startsWithPath(cell, fromSection)) return cell;
  if (classifyLocationHeading(cell[0]!) === "warehouse") return cell;

  const lastSection = fromSection[fromSection.length - 1];
  if (lastSection && foldLocationSegment(cell[0]!) === foldLocationSegment(lastSection)) {
    return [...fromSection.slice(0, -1), ...cell];
  }
  return [...fromSection, ...cell];
}

function sectionPathFrom(
  sectionPath: readonly string[] | null | undefined,
  section: string | null | undefined,
): string[] {
  if (sectionPath && sectionPath.length > 0) return [...sectionPath];
  if (isLocationHeading(section)) return splitLocationPath(section);
  return [];
}

function startsWithPath(path: readonly string[], prefix: readonly string[]): boolean {
  if (prefix.length > path.length) return false;
  return prefix.every(
    (segment, index) => foldLocationSegment(segment) === foldLocationSegment(path[index]!),
  );
}

function lastIndexOfClass(stack: readonly string[], kind: LocationHeadingClass): number {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (classifyLocationHeading(stack[index]!) === kind) return index;
  }
  return -1;
}

function uniqueSegments(parts: readonly string[]): string[] {
  const segments: string[] = [];
  for (const part of parts) {
    const code = normalizeLocationCode(part);
    if (!code) continue;
    const previous = segments[segments.length - 1];
    if (previous && foldLocationSegment(previous) === foldLocationSegment(code)) continue;
    segments.push(code);
  }
  return segments;
}
