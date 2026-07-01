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

import { makeConfidence } from "./confidence";
import { RECORD_TYPE_TARGET, type CanonicalField, type ColumnMapping, type ParsedTable, type RecordType, type RowClassification } from "./types";
import type { DetectedColumn } from "./types";

export type MotorInventoryKind = "engine" | "transmission";

export type MotorInventoryContext = {
  kind: MotorInventoryKind;
  sheetName: string;
  brandName: string;
  engineCode: string;
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

  const engineLayout = headerUsesEngineLayout(table.headers);
  const gearboxSheet = GEARBOX_SHEET.test(sheetName) && headerHasGearboxNumber(table.headers);

  if (gearboxSheet && !engineLayout) {
    return { kind: "transmission", sheetName, brandName: "", engineCode: "" };
  }

  if (!engineLayout) return null;

  const { brandName, engineCode } = resolveSheetBrandAndEngine(sheetName);
  return { kind: "engine", sheetName, brandName, engineCode };
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
  let engineCode = (next.model ?? context.engineCode).trim();

  if (!engineCode && serial) {
    engineCode = inferEngineCodeFromSerial(serial);
  }

  if (!brand && engineCode) {
    const { brandName } = resolveSheetBrandAndEngine(engineCode);
    if (brandName) brand = brandName;
  }

  if (brand) next.brand = brand;
  if (engineCode) next.model = engineCode;

  const nameParts = [brand, engineCode, serial].filter(Boolean);
  const derivedName = nameParts.join(" · ");
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
