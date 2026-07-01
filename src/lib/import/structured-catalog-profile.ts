/**
 * Structured supplier catalog (AutoCore perfect / supplier layouts).
 *
 * Columns: Марка · Модель · Тип · Название · Серийный номер · Цена · SKU · Склад.
 * Record type comes from the «Тип» column; «Название» is usually an engine/gearbox code.
 */

import { fold } from "@/lib/domain/normalize";
import { isLikelyEngineCode } from "@/lib/motors/import/brand-engine-intelligence";

import { makeConfidence } from "./confidence";
import { matchHeaderToFields } from "./canonical-fields";
import {
  RECORD_TYPE_TARGET,
  type CanonicalField,
  type ParsedTable,
  type RecordType,
  type RowClassification,
} from "./types";

export type StructuredCatalogContext = {
  sheetName: string;
};

const TYPE_COLUMN = /^тип$|^type$|^вид$|^category$/i;

const TYPE_RULES: Array<{ type: RecordType; tokens: string[]; score: number; reason: string }> = [
  { type: "engine", tokens: ["двигатель", "двс", "мотор", "engine", "motor"], score: 0.96, reason: "Тип «Двигатель»" },
  {
    type: "transmission",
    tokens: ["кпп", "коробка", "акпп", "мкпп", "вариатор", "transmission", "gearbox"],
    score: 0.96,
    reason: "Тип «КПП»",
  },
  { type: "transferCase", tokens: ["раздатка", "раздаточн", "transfer"], score: 0.94, reason: "Тип «Раздатка»" },
  { type: "reducer", tokens: ["редуктор", "мост", "дифференциал"], score: 0.93, reason: "Тип «Редуктор»" },
  { type: "turbo", tokens: ["турбина", "турбо", "turbo"], score: 0.93, reason: "Тип «Турбина»" },
  { type: "body", tokens: ["кузов", "кузовщина", "body"], score: 0.9, reason: "Тип «Кузов»" },
  { type: "optics", tokens: ["оптика", "фара", "фонар"], score: 0.9, reason: "Тип «Оптика»" },
  { type: "electrical", tokens: ["электрика", "эбу", "генератор", "стартер"], score: 0.88, reason: "Тип «Электрика»" },
  { type: "consumable", tokens: ["расходник", "расходные", "consumable"], score: 0.86, reason: "Тип «Расходник»" },
];

function headerField(headers: string[], field: CanonicalField): boolean {
  return headers.some((header) => matchHeaderToFields(header).some((match) => match.field === field));
}

function hasTypeColumn(headers: string[]): boolean {
  return headers.some((header) => TYPE_COLUMN.test(fold(header)));
}

/** Supplier-style table with an explicit «Тип» column and identity fields. */
export function detectStructuredCatalogContext(table: ParsedTable): StructuredCatalogContext | null {
  if (table.headers.length === 0 || table.rows.length === 0) return null;
  if (!hasTypeColumn(table.headers)) return null;

  const hasIdentity =
    headerField(table.headers, "brand") ||
    headerField(table.headers, "serial") ||
    headerField(table.headers, "sku") ||
    headerField(table.headers, "name");

  if (!hasIdentity) return null;
  return { sheetName: table.name.trim() };
}

function resolveTypeFromCategory(category: string): (typeof TYPE_RULES)[number] | null {
  const folded = fold(category);
  if (!folded) return null;
  for (const rule of TYPE_RULES) {
    if (rule.tokens.some((token) => folded.includes(fold(token)))) return rule;
  }
  return null;
}

export function classifyStructuredCatalogRecord(
  values: Partial<Record<CanonicalField, string>>,
): RowClassification | null {
  const category = (values.category ?? "").trim();
  if (!category) return null;

  const rule = resolveTypeFromCategory(category);
  if (!rule) return null;

  return {
    recordType: rule.type,
    target: RECORD_TYPE_TARGET[rule.type],
    confidence: makeConfidence(rule.score, rule.reason, "rules"),
  };
}

export function enrichStructuredCatalogValues(
  values: Partial<Record<CanonicalField, string>>,
): Partial<Record<CanonicalField, string>> {
  const next = { ...values };
  const brand = (next.brand ?? "").trim();
  const model = (next.model ?? "").trim();
  const code = (next.name ?? "").trim();
  const serial = (next.serial ?? "").trim();
  const category = (next.category ?? "").trim();

  const typeRule = category ? resolveTypeFromCategory(category) : null;
  const codeIsEngine = code && isLikelyEngineCode(code);

  if (typeRule?.type === "engine" && codeIsEngine && !next.model) {
    next.model = code;
  }

  const displayParts = [brand, model || (typeRule?.type === "engine" ? code : ""), code, serial].filter(
    Boolean,
  );
  const uniqueParts = [...new Set(displayParts)];
  if (uniqueParts.length >= 2) {
    next.name = uniqueParts.join(" · ");
  } else if (!next.name && code) {
    next.name = code;
  }

  return next;
}

export function structuredCatalogRequiredFields(
  values: Partial<Record<CanonicalField, string>>,
): CanonicalField[] {
  if (values.name || values.serial) return [];
  return ["name"];
}
