/**
 * Motor dismantling catalog profile (MOTOR LAND–style workbooks).
 *
 * Sheets named by engine family with columns like «НОМЕР ДВИГАТЕЛЯ», «КОМПЛЕКТАЦИЯ»,
 * «КОРОБКА», «ДАТА ПРИХОДА». Reuses the battle-tested motors import field detector
 * so business migration classifies engines the same way as the motors Excel import.
 */

import { fold } from "@/lib/domain/normalize";
import {
  detectEngineField,
  type EngineFieldMapping,
} from "@/lib/motors/excel-column-mapping";
import { resolveSheetBrandAndEngine } from "@/lib/motors/import/brand-engine-intelligence";
import {
  engineDisplayName,
  readEngineCode,
} from "@/lib/motors/import/engine-code-shorthand";

import { findEngineCodeColumn } from "./engine-column-sniff";

import { makeConfidence } from "./confidence";
import { RECORD_TYPE_TARGET, type CanonicalField, type ColumnMapping, type ParsedTable, type RecordType, type RowClassification } from "./types";
import type { DetectedColumn } from "./types";

export type MotorInventoryKind = "engine" | "transmission";

export type MotorInventoryContext = {
  kind: MotorInventoryKind;
  sheetName: string;
  brandName: string;
  engineCode: string;
  /**
   * Column the engine code lives in, when the sheet was recognised by its
   * values rather than its headers. Empty on sheets named after an engine
   * family, where the code comes from the sheet name instead.
   */
  engineCodeHeader?: string;
};

const ENGINE_FIELD_TO_CANONICAL: Partial<Record<EngineFieldMapping, CanonicalField>> = {
  serialCode: "serial",
  configuration: "model",
  notes: "comment",
  quantity: "quantity",
  brandName: "brand",
  engineCode: "model",
};

const ENGINE_SERIAL_HEADER = /номер\s*двигател|engine\s*number|serial/i;
const GEARBOX_SHEET = /короб|кпп|gearbox|transmission/i;

function headerUsesEngineLayout(headers: string[]): boolean {
  return headers.some((header) => ENGINE_SERIAL_HEADER.test(fold(header)));
}

function headerHasGearboxNumber(headers: string[]): boolean {
  return headers.some((header) => {
    const folded = fold(header);
    return folded === "номер" || folded === "serial" || folded === "№";
  });
}

/** Detect MOTOR LAND–style motor inventory tables (by column layout, not sheet title). */
export function detectMotorInventoryContext(table: ParsedTable): MotorInventoryContext | null {
  const sheetName = table.name.trim();
  if (table.headers.length === 0 || table.rows.length === 0) return null;

  const gearboxSheet = GEARBOX_SHEET.test(sheetName) && headerHasGearboxNumber(table.headers);
  const headerLayout = headerUsesEngineLayout(table.headers);

  // A header alone is not enough evidence. Books organised by branch call the
  // sheet after the yard («СВЕРДЛОВА») and the column simply «НОМЕР», so the
  // values decide when the wording does not.
  const codeColumn = headerLayout ? null : findEngineCodeColumn(table.headers, table.rows);
  const engineLayout = headerLayout || codeColumn != null;

  if (gearboxSheet && !engineLayout) {
    return { kind: "transmission", sheetName, brandName: "", engineCode: "" };
  }

  if (!engineLayout) return null;

  const { brandName, engineCode } = resolveSheetBrandAndEngine(sheetName);
  return {
    kind: "engine",
    sheetName,
    brandName,
    engineCode,
    ...(codeColumn ? { engineCodeHeader: codeColumn.header } : {}),
  };
}

function labelForEngineField(field: EngineFieldMapping): string {
  switch (field) {
    case "serialCode":
      return "Серийный номер";
    case "configuration":
      return "Комплектация";
    case "notes":
      return "Особые отметки";
    case "quantity":
      return "Количество";
    case "transmission":
      return "Коробка";
    case "arrivalDate":
      return "Дата прихода";
    case "soldDate":
      return "Дата продажи";
    default:
      return field;
  }
}

/** Deterministic column mapping for motor inventory sheets. */
export function buildMotorInventoryMapping(
  table: ParsedTable,
  context: MotorInventoryContext,
): ColumnMapping {
  const columns: DetectedColumn[] = table.headers.map((header) => {
    // A column recognised by its values wins over the header dictionary: it is
    // the one actually holding `EJ251- C085834`, whatever it is titled.
    if (context.engineCodeHeader && header === context.engineCodeHeader) {
      return {
        header,
        field: "serial" as const,
        confidence: makeConfidence(
          0.94,
          `Каталог моторов: «${header}» содержит коды двигателей`,
          "rules",
        ),
        alternatives: [],
      };
    }

    const engineField = detectEngineField(header);
    const canonical = engineField ? ENGINE_FIELD_TO_CANONICAL[engineField] ?? null : null;

    if (engineField === "transmission" || engineField === "arrivalDate" || engineField === "soldDate") {
      return {
        header,
        field: null,
        confidence: makeConfidence(0, `«${header}» — служебная колонка каталога`, "rules"),
        alternatives: [],
      };
    }

    const confidence = canonical
      ? makeConfidence(
          0.96,
          `Каталог моторов: «${header}» → ${labelForEngineField(engineField!)}`,
          "rules",
        )
      : makeConfidence(0, "Колонка не используется в каталоге моторов", "rules");

    return {
      header,
      field: canonical,
      confidence,
      alternatives: [],
    };
  });

  const fields: Partial<Record<CanonicalField, string>> = {};
  columns.forEach((col) => {
    if (col.field) fields[col.field] = col.header;
  });

  const hasIdentity = Boolean(fields.serial || fields.name);
  return {
    fields,
    columns,
    needsAi: !hasIdentity,
  };
}

function inferEngineCodeFromSerial(serial: string): string {
  const trimmed = serial.trim();
  const match = trimmed.match(/^([A-Za-z]{1,4}\d{1,3}[A-Za-z0-9]*)[\s\-_/]/);
  if (match?.[1]) return match[1].replace(/\s+/g, "").toUpperCase();
  if (/^[A-Za-z]{1,4}\d{1,3}[A-Za-z0-9]*$/i.test(trimmed.replace(/\s+/g, ""))) {
    return trimmed.replace(/\s+/g, "").toUpperCase();
  }
  return "";
}

/** Fill brand, model and display name from sheet context + raw row. */
export function enrichMotorInventoryValues(
  values: Partial<Record<CanonicalField, string>>,
  raw: Record<string, string>,
  context: MotorInventoryContext,
): Partial<Record<CanonicalField, string>> {
  const next = { ...values };

  const gearboxHeader = Object.keys(raw).find((header) => detectEngineField(header) === "transmission");
  const gearbox = gearboxHeader ? (raw[gearboxHeader] ?? "").trim() : "";
  const serial = (next.serial ?? "").trim();

  let brand = (next.brand ?? context.brandName).trim();
  let variant: string | null = null;

  // `model` is a loose bucket: the catalog mapping funnels both «КОМПЛЕКТАЦИЯ»
  // and the engine-code column into it, so it can just as easily hold "полная"
  // as "EJ253". Only take it as a code if it reads as one, and let the serial —
  // which is where the code actually lives — win when it does.
  const declaredModel = (next.model ?? "").trim();
  const modelReading = readEngineCode(declaredModel);
  const configuration = modelReading ? "" : declaredModel;

  const reading = readEngineCode(serial) ?? modelReading;
  let engineCode = reading?.code ?? context.engineCode.trim();
  if (reading?.brand && !brand) brand = reading.brand;
  variant = reading?.variant ?? null;

  if (!engineCode && serial) {
    engineCode = inferEngineCodeFromSerial(serial);
  }

  // Displaced configuration is still real information about the unit.
  if (configuration && configuration !== "N/A" && configuration !== "—" && configuration !== "-") {
    const note = `Комплектация: ${configuration}`;
    next.comment = next.comment ? `${next.comment}; ${note}` : note;
  }

  if (!brand && engineCode) {
    const { brandName } = resolveSheetBrandAndEngine(engineCode);
    if (brandName) brand = brandName;
  }

  // Engine codes are upper case by convention (EJ253, 2JZ-GTE, 4G63). The
  // sheet-name path can yield `ej251`, and two spellings of one code would
  // read as two different products.
  if (engineCode) engineCode = engineCode.toUpperCase();

  if (brand) next.brand = brand;
  if (engineCode) next.model = engineCode;

  // `Subaru EJ253 AVCS` reads like a catalogue entry; the old
  // `brand · code · serial` put the unit number in the product name, so two
  // identical engines never looked like the same product.
  const derivedName =
    engineCode || brand
      ? engineDisplayName({
          code: engineCode,
          brand: brand || null,
          variant,
          source: reading?.source ?? "explicit",
        })
      : serial;
  if (derivedName && (!next.name || next.name === "N/A" || next.name === "—" || next.name === "-")) {
    next.name = derivedName;
  }

  if (gearbox && gearbox !== "N/A" && gearbox !== "—" && gearbox !== "-") {
    const note = `Коробка: ${gearbox}`;
    next.comment = next.comment ? `${next.comment}; ${note}` : note;
  }

  return next;
}

export function classifyMotorInventoryRecord(
  values: Partial<Record<CanonicalField, string>>,
  context: MotorInventoryContext,
): RowClassification | null {
  const serial = (values.serial ?? "").trim();
  const name = (values.name ?? "").trim();

  if (context.kind === "transmission") {
    if (!serial && !name) return null;
    return {
      recordType: "transmission",
      target: RECORD_TYPE_TARGET.transmission,
      confidence: {
        score: serial ? 0.92 : 0.75,
        tier: serial ? "high" : "medium",
        reason: "Лист коробок передач — запись КПП",
        source: "rules",
      },
    };
  }

  if (!serial && !name) return null;

  return {
    recordType: "engine",
    target: RECORD_TYPE_TARGET.engine,
    confidence: {
      score: serial ? 0.94 : 0.8,
      tier: serial ? "high" : "medium",
      reason: context.engineCode
        ? `Каталог двигателей ${context.engineCode}`
        : "Каталог двигателей — серийный номер агрегата",
      source: "rules",
    },
  };
}

export function motorInventoryRequiredFields(
  context: MotorInventoryContext,
  values: Partial<Record<CanonicalField, string>>,
): CanonicalField[] {
  if (context.kind === "engine") {
    return values.serial || values.name ? [] : ["serial"];
  }
  if (context.kind === "transmission") {
    return values.serial || values.name ? [] : ["serial"];
  }
  return ["name"];
}

export function dominantMotorInventoryType(kind: MotorInventoryKind): RecordType {
  return kind === "transmission" ? "transmission" : "engine";
}
