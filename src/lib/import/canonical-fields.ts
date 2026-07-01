/**
 * Canonical field catalog.
 *
 * For every destination field the engine knows:
 *  - `aliases`: header words (RU + EN + common spreadsheet wording) that name it
 *  - `valueDetector`: an optional data-level test that confirms the field from
 *    the column's sample values, so detection works even with unlabeled or
 *    mislabeled headers.
 *
 * This is the single source of truth for automatic column detection. Add a new
 * synonym here and every import surface understands it.
 */

import { fold } from "@/lib/domain/normalize";

import type { CanonicalField } from "./types";
import {
  detectCurrency,
  isVin,
  looksLikeCode,
  looksLikeCondition,
  looksLikeMileage,
  looksLikePhoto,
  looksLikePrice,
  looksLikeQuantity,
  parseYear,
} from "./value-detectors";

export type FieldSignature = {
  field: CanonicalField;
  label: string;
  /** Folded header synonyms. Order does not matter. */
  aliases: string[];
  /** Returns true when a sample value looks like this field. */
  valueDetector?: (value: string) => boolean;
  /**
   * How conclusive a positive value detection is (0–1). A 17-char VIN is
   * near-certain (1); a generic alphanumeric code is weak (~0.45).
   */
  valueWeight?: number;
  /** Whether the field is required for a usable record. */
  required?: boolean;
  /** Detection weight — distinctive fields (VIN) outrank generic ones (name). */
  weight?: number;
};

export const FIELD_SIGNATURES: FieldSignature[] = [
  {
    field: "name",
    label: "Название",
    required: true,
    weight: 0.8,
    aliases: [
      "название",
      "наименование",
      "товар",
      "номенклатура",
      "позиция",
      "запчасть",
      "деталь",
      "name",
      "title",
      "product",
      "item",
      "description",
      "описание двигателя",
      "название двигателя",
      // A column named after the item kind (e.g. «Двигатель», «КПП») names it.
      "двигатель",
      "двс",
      "мотор",
      "агрегат",
    ],
  },
  {
    field: "sku",
    label: "Артикул",
    weight: 1,
    aliases: [
      "артикул",
      "арт",
      "код",
      "код товара",
      "номенклатурный номер",
      "sku",
      "article",
      "part number",
      "partno",
      "pn",
      "код детали",
    ],
    valueDetector: (value) => looksLikeCode(value),
    valueWeight: 0.45,
  },
  {
    field: "serial",
    label: "Серийный номер",
    weight: 1.1,
    aliases: [
      "серийный номер",
      "серийник",
      "номер двигателя",
      "номер агрегата",
      "serial",
      "serial number",
      "engine number",
      "номер",
      "s/n",
      "sn",
    ],
    valueDetector: (value) => looksLikeCode(value) && !isVin(value),
    valueWeight: 0.5,
  },
  {
    field: "vin",
    label: "VIN",
    weight: 1.4,
    aliases: ["vin", "вин", "vin код", "vin number", "номер кузова", "frame"],
    valueDetector: (value) => isVin(value),
    valueWeight: 1,
  },
  {
    field: "brand",
    label: "Марка",
    weight: 1,
    aliases: [
      "марка",
      "бренд",
      "производитель",
      "brand",
      "make",
      "manufacturer",
      "марка авто",
      "марка двигателя",
    ],
  },
  {
    field: "model",
    label: "Модель",
    weight: 1,
    aliases: ["модель", "model", "модель авто", "модель двигателя"],
  },
  {
    field: "year",
    label: "Год",
    weight: 1.1,
    aliases: ["год", "год выпуска", "year", "г.в.", "гв", "год авто"],
    valueDetector: (value) => parseYear(value) !== null,
    valueWeight: 0.7,
  },
  {
    field: "price",
    label: "Цена",
    weight: 1,
    aliases: [
      "цена",
      "стоимость",
      "цена продажи",
      "розница",
      "price",
      "cost",
      "amount",
      "сумма",
      "цена руб",
    ],
    valueDetector: (value) => looksLikePrice(value),
    valueWeight: 0.55,
  },
  {
    field: "currency",
    label: "Валюта",
    weight: 1.2,
    aliases: ["валюта", "currency", "cur", "вал"],
    valueDetector: (value) => detectCurrency(value) !== null && value.trim().length <= 6,
    valueWeight: 0.8,
  },
  {
    field: "mileage",
    label: "Пробег",
    weight: 1.2,
    aliases: ["пробег", "mileage", "odometer", "пробег км", "km"],
    valueDetector: (value) => looksLikeMileage(value),
    valueWeight: 0.55,
  },
  {
    field: "quantity",
    label: "Количество",
    weight: 0.9,
    aliases: [
      "количество",
      "кол-во",
      "колво",
      "кол",
      "остаток",
      "qty",
      "quantity",
      "count",
      "штук",
      "шт",
      "наличие",
    ],
    valueDetector: (value) => looksLikeQuantity(value),
    valueWeight: 0.35,
  },
  {
    field: "category",
    label: "Категория",
    weight: 0.9,
    aliases: ["категория", "category", "группа", "тип", "раздел", "вид"],
  },
  {
    field: "subcategory",
    label: "Подкатегория",
    weight: 0.9,
    aliases: ["подкатегория", "subcategory", "подгруппа", "подраздел"],
  },
  {
    field: "condition",
    label: "Состояние",
    weight: 1,
    aliases: ["состояние", "condition", "состояние детали", "качество", "статус"],
    valueDetector: (value) => looksLikeCondition(value),
    valueWeight: 0.65,
  },
  {
    field: "comment",
    label: "Комментарий",
    weight: 0.6,
    aliases: [
      "комментарий",
      "коммент",
      "примечание",
      "заметка",
      "comment",
      "note",
      "notes",
      "описание",
      "доп",
      "особые отметки",
      "прим",
      "прим.",
    ],
  },
  {
    field: "photo",
    label: "Фото",
    weight: 1.1,
    aliases: ["фото", "фотография", "изображение", "картинка", "photo", "image", "img", "picture"],
    valueDetector: (value) => looksLikePhoto(value),
    valueWeight: 0.85,
  },
  {
    field: "warehouse",
    label: "Склад",
    weight: 1,
    aliases: ["склад", "warehouse", "хранилище", "точка"],
  },
  {
    field: "location",
    label: "Местоположение",
    weight: 1,
    aliases: [
      "местоположение",
      "ячейка",
      "полка",
      "стеллаж",
      "location",
      "место",
      "адрес хранения",
      "позиция склада",
    ],
  },
];

/** Quick lookup by field. */
export const FIELD_SIGNATURE_BY_FIELD: Record<CanonicalField, FieldSignature> =
  FIELD_SIGNATURES.reduce(
    (acc, signature) => {
      acc[signature.field] = signature;
      return acc;
    },
    {} as Record<CanonicalField, FieldSignature>,
  );

/** Folded alias index for fast header matching. */
const FOLDED_ALIASES: Array<{ field: CanonicalField; alias: string; weight: number }> =
  FIELD_SIGNATURES.flatMap((signature) =>
    signature.aliases.map((alias) => ({
      field: signature.field,
      alias: fold(alias),
      weight: signature.weight ?? 1,
    })),
  );

export type HeaderMatch = {
  field: CanonicalField;
  /** 0–1 header match strength. */
  score: number;
  kind: "exact" | "contains" | "token";
};

/**
 * Score a header string against every field's aliases. Returns best-first
 * candidates so the column detector can resolve conflicts globally.
 */
export function matchHeaderToFields(header: string): HeaderMatch[] {
  const folded = fold(header);
  if (!folded) return [];

  const headerTokens = new Set(folded.split(" ").filter(Boolean));
  const matches = new Map<CanonicalField, HeaderMatch>();

  for (const { field, alias, weight } of FOLDED_ALIASES) {
    if (!alias) continue;
    let kind: HeaderMatch["kind"] | null = null;
    let base = 0;

    if (folded === alias) {
      kind = "exact";
      // An exact header match is fully trusted regardless of field weight.
      base = 1;
    } else if (folded.includes(alias) || alias.includes(folded)) {
      kind = "contains";
      // Longer overlap is more trustworthy.
      base = 0.82 * (Math.min(folded.length, alias.length) / Math.max(folded.length, alias.length));
    } else if (headerTokens.has(alias)) {
      kind = "token";
      base = 0.74;
    }

    if (!kind) continue;
    // Weights bias ambiguous (fuzzy) matches only; exact matches stay at 1.
    const score = kind === "exact" ? 1 : Math.min(1, base * weight);
    const existing = matches.get(field);
    if (!existing || score > existing.score) {
      matches.set(field, { field, score, kind });
    }
  }

  return [...matches.values()].sort((a, b) => b.score - a.score);
}
