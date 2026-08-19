import {
  IMPORT_GRID_BASE_LAYER,
  isGridPlaceholder,
  joinGridFragments,
  sanitizeGridText,
} from "@/lib/import/ai-grid-contract";

/**
 * The motors Excel grid, as the user sees it:
 *
 *   #  BRAND  ENGINE  ENGINE NUMBER  CONFIGURATION  SPECIAL NOTES  QUALITY  PHOTO  QTY  TRANSMISSION  LOCATION
 *
 * Import — rules or AI — may only produce these cells. Anything the source does not
 * state stays empty; nothing is guessed to make a column look filled.
 */
export const MOTOR_GRID_COLUMNS = [
  "brandName",
  "engineCode",
  "serialCode",
  "configuration",
  "notes",
  "quality",
  "quantity",
  "transmission",
  "warehouseLocation",
  "arrivalDate",
  "soldDate",
] as const;

export type MotorGridColumn = (typeof MOTOR_GRID_COLUMNS)[number];

export type MotorGridCells = {
  /** BRAND — manufacturer only (Subaru, Toyota…). Never an engine code. */
  brandName: string;
  /** ENGINE — engine family code, normalized lowercase (ej251, fb25, 6g72). */
  engineCode: string;
  /** ENGINE NUMBER — the serial alone, with the family prefix stripped off. */
  serialCode: string;
  /** CONFIGURATION — equipment (ГУР, С КОРОБКОЙ) and operational qualifiers (ПОСЛЕ ДЭНА). */
  configuration: string;
  /** SPECIAL NOTES — free remarks and any source value that fits no other column. */
  notes: string;
  /** QUALITY — grade, only when the source states one. */
  quality: string;
  /** QTY — defaults to 1; never 0. */
  quantity: number;
  /** TRANSMISSION — gearbox presence/code. */
  transmission: string;
  /** LOCATION — only a real warehouse/shelf, never a workflow marker. */
  warehouseLocation: string;
  arrivalDate: Date | null;
  soldDate: Date | null;
};

export function emptyMotorGridCells(): MotorGridCells {
  return {
    brandName: "",
    engineCode: "",
    serialCode: "",
    configuration: "",
    notes: "",
    quality: "",
    quantity: 1,
    transmission: "",
    warehouseLocation: "",
    arrivalDate: null,
    soldDate: null,
  };
}

function sanitizeQuantity(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  const text = sanitizeGridText(value);
  if (!text) return 1;
  const parsed = Number.parseInt(text.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function sanitizeDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  return null;
}

/**
 * Force any candidate row onto the grid contract.
 *
 * This is the enforcement half of the base layer: whatever the rules engine or the
 * model produced, what reaches the grid is trimmed, placeholder-free, correctly
 * typed, and carries no value in a column that column does not own.
 */
/**
 * Raw candidate cells. Everything is `unknown` because the two callers — the rules engine
 * reading spreadsheet strings and the model returning JSON — disagree on types, and the
 * projector is exactly the place where that stops mattering.
 */
export type MotorGridCandidate = {
  [K in MotorGridColumn]?: unknown;
};

export function projectOntoMotorGrid(input: MotorGridCandidate): MotorGridCells {
  const notes = sanitizeGridText(input.notes);
  const configuration = sanitizeGridText(input.configuration);

  return {
    brandName: sanitizeGridText(input.brandName),
    engineCode: sanitizeGridText(input.engineCode).toLowerCase(),
    serialCode: sanitizeGridText(input.serialCode),
    configuration,
    notes,
    quality: sanitizeGridText(input.quality),
    quantity: sanitizeQuantity(input.quantity),
    transmission: sanitizeGridText(input.transmission),
    warehouseLocation: sanitizeGridText(input.warehouseLocation),
    arrivalDate: sanitizeDate(input.arrivalDate),
    soldDate: sanitizeDate(input.soldDate),
  };
}

/** Append a fragment to a grid text cell without duplicating what is already there. */
export function appendToGridCell(current: string, ...fragments: string[]): string {
  return joinGridFragments([current, ...fragments]);
}

export { isGridPlaceholder, sanitizeGridText, joinGridFragments };

/**
 * Column-by-column instructions handed to the model. Mirrors `MotorGridCells`
 * one-to-one, so a schema change here is a prompt change there.
 */
export const MOTOR_GRID_CONTRACT_PROMPT = `
${IMPORT_GRID_BASE_LAYER}

THE MOTORS GRID (this is the entire output surface)
| column           | holds                                                    | leave empty when |
|------------------|----------------------------------------------------------|------------------|
| brandName        | car MANUFACTURER only: Subaru, Toyota, Nissan, BMW…       | no brand stated and none inferable from the engine family |
| engineCode       | engine FAMILY code, lowercase, no spaces: ej251, fb25, 6g72, n62b44 | the row has only a bare serial and the sheet names several families |
| serialCode       | the engine number ALONE, family prefix removed            | the cell is blank or "???" |
| configuration    | equipment (ГУР, ГЕНЕРАТОР, С КОРОБКОЙ) and operational qualifiers (ПОСЛЕ ДЭНА, РЕМОНТ ДЭН, СВЕРДЛОВА, ТОРГОВЫЙ СКЛАД, ВОЗВРАТ, НА РЕМОНТ) | neither is present |
| notes            | free remarks (SOLD, ПРОДАН, «4-й цилиндр не открывается») plus any source value that fits no other column | the row has no remarks |
| quality          | a stated grade/condition rating                           | almost always — this file format has no quality column |
| quantity         | КОЛ-ВО; integer ≥ 1                                       | never — default 1 |
| transmission     | КОРОБКА / КПП / АКПП / «с коробкой»                       | the cell is blank or "N/A" |
| warehouseLocation| a real warehouse or shelf name                            | the source only has a workflow marker — those go to configuration, NOT here |
| arrivalDate      | ДАТА ПРИХОДА, ISO yyyy-mm-dd                              | unparseable or absent |
| soldDate         | ДАТА ПРОДАЖИ, ISO yyyy-mm-dd                              | unparseable or absent — do NOT substitute today's date |

SPLITTING THE ENGINE NUMBER (the single most important rule)
The number cell usually carries the family and the serial together, separated by "- ":
  "EJ251- 442063"        → engineCode "ej251",     serialCode "442063"
  "EJ253AVCS- 941215"    → engineCode "ej253avcs", serialCode "941215"
  "253AVCS- L273774"     → engineCode "ej253avcs", serialCode "L273774"   (bare 2xx on a Subaru sheet is EJ2xx)
  "N62 B44- 155232200"   → engineCode "n62b44",    serialCode "155232200"
  "EZ 3.6- U243139"      → engineCode "ez36",      serialCode "U243139"
  "EJ-254 C392527"       → engineCode "ej254",     serialCode "C392527"
  "K4M- A752- D036996"   → engineCode "k4m",       serialCode "D036996",  "A752" → configuration
  "C090606"              → serialCode "C090606",   engineCode from the sheet/section
  "VQ40- ???"            → engineCode "vq40",      serialCode ""          (and a warning)
Never leave the family prefix inside serialCode. Never put the whole cell in engineCode.

SECTION HEADER ROWS ARE NOT MOTORS
A row with a single cell that is only a brand or an engine family — "VQ40", "VQ35", "1KZ",
"2KD", "RENAULT", "FORD", "SUBARU", "МОТОРЫ ПОСЛЕ ДЭНА" — is a section heading. It sets the
brand/engine context for the rows beneath it and must never be emitted as a motor.

OPERATIONAL QUALIFIERS GO TO CONFIGURATION
Workflow markers name where the engine has been, not what it is: ПОСЛЕ ДЭНА, ПОСЛЕ ДАНИКА,
РЕМОНТ ДЭН, РЕМОНТ ДАНИЯР, РЕМОНТ ТОЛЯ, СВЕРДЛОВА, ТОРГОВЫЙ СКЛАД, ВОЗВРАТ, НА РЕМОНТ,
УСТАНОВКА. They belong in configuration — whether they come from the sheet tab, the sheet
title, a section header, or a cell. When such a phrase is the entire content of a notes cell,
move it; when it is mixed with other text, copy the marker into configuration and leave the
original note intact. Never route them to warehouseLocation.
`.trim();
