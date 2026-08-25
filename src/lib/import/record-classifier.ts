/**
 * Record-type classification.
 *
 * Order of precedence:
 *   1. Domain Dictionary  (engines / transmissions / body parts / consumables …)
 *   2. Engine code        (a stock book row that is only `EJ251- C085834`)
 *   3. Keyword rules      (refine coarse dictionary hits, cover gaps)
 *   4. AI fallback        (only when the rest cannot decide — handled by caller)
 *
 * The classifier itself never calls AI; it returns `needsAi: true` so the
 * orchestrator can batch the uncertain rows to an injected {@link ImportAiPort}.
 */

import { fold } from "@/lib/domain/normalize";
import { searchDomain } from "@/lib/domain/domain-dictionary";
import type { DomainCategory } from "@/lib/domain/types";
import type { DomainDictionary } from "@/lib/domain/domain-dictionary";

import { readEngineCode } from "@/lib/motors/import/engine-code-shorthand";

import { fromDictionaryScore, makeConfidence } from "./confidence";
import { transmissionSignalFrom } from "./transmission-unit";
import { isVin, looksLikeMileage, parseYear } from "./value-detectors";
import {
  RECORD_TYPE_TARGET,
  type CanonicalField,
  type RecordType,
  type RowClassification,
} from "./types";

export type ClassifyOptions = {
  /** Optional per-category company dictionary overlay. */
  getCompanyDictionary?: (category: DomainCategory) => DomainDictionary | null;
};

/** Strong keyword signals, checked before falling back. Order = priority. */
const KEYWORD_RULES: Array<{ type: RecordType; tokens: string[]; score: number }> = [
  { type: "turbo", tokens: ["турбин", "turbo", "турбо", "цхра", "chra"], score: 0.93 },
  { type: "transferCase", tokens: ["раздатк", "раздаточн", "transfer case"], score: 0.93 },
  { type: "reducer", tokens: ["редуктор", "дифференциал", "diff", "reducer"], score: 0.92 },
  {
    type: "optics",
    tokens: ["фара", "фонар", "оптика", "headlight", "blok far", "птф", "лампа"],
    score: 0.9,
  },
  {
    type: "suspension",
    tokens: [
      "подвеск",
      "амортизатор",
      "стойк",
      "рычаг",
      "сайлентблок",
      "пружин",
      "ступиц",
      "suspension",
      "shock",
    ],
    score: 0.88,
  },
  {
    type: "electrical",
    tokens: [
      "электрик",
      "генератор",
      "стартер",
      "блок управлен",
      "эбу",
      "проводк",
      "датчик",
      "реле",
      "alternator",
      "starter",
      "ecu",
    ],
    score: 0.86,
  },
  { type: "transmission", tokens: ["кпп", "коробка", "акпп", "мкпп", "вариатор", "transmission", "gearbox"], score: 0.9 },
  { type: "engine", tokens: ["двигател", "двс", "мотор", "engine", "motor"], score: 0.88 },
  {
    type: "body",
    tokens: [
      "кузов",
      "капот",
      "крыло",
      "дверь",
      "бампер",
      "крышка",
      "body",
      "fender",
      "hood",
      "bumper",
      "морда",
      "ноускат",
      "noskat",
    ],
    score: 0.85,
  },
  {
    type: "consumable",
    tokens: ["масло", "фильтр", "антифриз", "колодк", "ремень", "свеч", "жидкост", "oil", "filter"],
    score: 0.84,
  },
];

const DICTIONARY_PRIORITY: Array<{ category: DomainCategory; type: RecordType }> = [
  { category: "engines", type: "engine" },
  { category: "transmissions", type: "transmission" },
  { category: "bodyParts", type: "body" },
  { category: "consumables", type: "consumable" },
];

function buildQuery(values: Partial<Record<CanonicalField, string>>): string {
  return [values.name, values.category, values.subcategory]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function lookupDictionary(
  query: string,
  options: ClassifyOptions,
): { type: RecordType; score: number; entry?: import("@/lib/domain/types").DomainEntry } | null {
  if (!query.trim()) return null;
  let best: { type: RecordType; score: number; entry?: import("@/lib/domain/types").DomainEntry } | null = null;
  for (const { category, type } of DICTIONARY_PRIORITY) {
    const companyDict = options.getCompanyDictionary?.(category) ?? null;
    const results = searchDomain(category, query, companyDict, { limit: 1 });
    const top = results[0];
    if (!top) continue;
    const score = fromDictionaryScore(top.score);
    if (!best || score > best.score) {
      best = { type, score, entry: top.entry };
    }
  }
  return best;
}

/** Apply keyword rules to a folded text blob. */
function keywordMatch(folded: string): { type: RecordType; score: number } | null {
  for (const rule of KEYWORD_RULES) {
    if (rule.tokens.some((token) => folded.includes(fold(token)))) {
      return { type: rule.type, score: rule.score };
    }
  }
  return null;
}

/** Refine a coarse "bodyParts" dictionary hit into the specific part type. */
function refineBodyType(folded: string): RecordType {
  const keyword = keywordMatch(folded);
  if (keyword && ["optics", "suspension", "electrical", "body"].includes(keyword.type)) {
    return keyword.type;
  }
  return "body";
}

/**
 * Whether the row names an item — a part, an engine, a gearbox — rather than
 * describing a vehicle. Checked against the row's own words only: a VIN or a
 * year says nothing about which of the two this is.
 */
function describesStockItem(values: Partial<Record<CanonicalField, string>>): boolean {
  // The identity checks come first: an engine row on a catalog sheet often has
  // no name column at all, only `VIN | J35Y-4410021 | полная`. Guarding on the
  // text first made that row fall through to the VIN and become a second car.
  if (transmissionSignalFrom([values.name, values.serial])) return true;
  if (readEngineCode(values.serial) ?? readEngineCode(values.name)) return true;

  const text = [values.name, values.category, values.subcategory].filter(Boolean).join(" ").trim();
  if (!text) return false;
  if (keywordMatch(fold(text))) return true;
  const hit = lookupDictionary(text, {});
  return Boolean(hit && hit.score >= 0.6);
}

function donorSignal(values: Partial<Record<CanonicalField, string>>): boolean {
  if (values.vin && isVin(values.vin)) return true;
  if (values.mileage && looksLikeMileage(values.mileage)) return true;
  if (values.year && parseYear(values.year) !== null && (values.model || values.brand)) return true;
  return false;
}

export function classifyRecord(
  values: Partial<Record<CanonicalField, string>>,
  options: ClassifyOptions = {},
): RowClassification {
  const query = buildQuery(values);
  const folded = fold([query, values.brand, values.model].filter(Boolean).join(" "));

  // Donor vehicles are recognised structurally (VIN / mileage / year + model)
  // — but only when the row does not already name a thing.
  //
  // In a dismantling book the donor's VIN is written on every part pulled off
  // that car; that is the whole point of the column. Firing on the VIN alone
  // turned "Бампер передний · VIN JH4…" into a second Acura TLX, so a car with
  // eleven parts became twelve cars and no part was ever linked to anything.
  if (donorSignal(values) && !describesStockItem(values)) {
    return {
      recordType: "donorCar",
      target: RECORD_TYPE_TARGET.donorCar,
      confidence: makeConfidence(
        values.vin && isVin(values.vin) ? 0.95 : 0.78,
        values.vin ? "Найден VIN — это автомобиль-донор" : "Год, модель и пробег указывают на авто-донор",
        "rules",
      ),
    };
  }

  // 1) Domain Dictionary — name/category first so comments do not dilute short codes.
  const dictionaryQueries: string[] = [];
  for (const candidate of [
    values.name,
    values.category,
    buildQuery(values),
    [values.name, values.comment].filter(Boolean).join(" "),
  ]) {
    if (!candidate || dictionaryQueries.includes(candidate)) continue;
    dictionaryQueries.push(candidate);
  }

  let bestDict: { type: RecordType; score: number; entry?: import("@/lib/domain/types").DomainEntry } | null =
    null;
  for (const query of dictionaryQueries) {
    const hit = lookupDictionary(query, options);
    if (!hit) continue;
    if (!bestDict || hit.score > bestDict.score) bestDict = hit;
    if (bestDict.score >= 0.85) break;
  }

  if (bestDict && bestDict.score >= 0.6) {
    const recordType = bestDict.type === "body" ? refineBodyType(folded) : bestDict.type;
    return {
      recordType,
      target: RECORD_TYPE_TARGET[recordType],
      confidence: makeConfidence(
        bestDict.score,
        bestDict.entry
          ? `Совпадение со словарём: ${bestDict.entry.name}`
          : "Совпадение со словарём AutoCore",
        "dictionary",
      ),
      matchedEntry: bestDict.entry,
    };
  }

  // 2) An engine code in the serial or the name. A stock book that carries
  //    only `EJ251- C085834` has nothing for the dictionary to match on — no
  //    name column, no category — and used to fall all the way through to
  //    `unknown`. The code itself is the strongest signal such a row has.
  const gearbox = transmissionSignalFrom([values.serial, values.name, values.model]);
  if (gearbox) {
    return {
      recordType: "transmission",
      target: RECORD_TYPE_TARGET.transmission,
      confidence: makeConfidence(0.9, `Коробка передач — «${gearbox}»`, "rules"),
    };
  }

  const codeReading = readEngineCode(values.serial) ?? readEngineCode(values.name);
  if (codeReading) {
    return {
      recordType: "engine",
      target: RECORD_TYPE_TARGET.engine,
      confidence: makeConfidence(
        codeReading.brand ? 0.9 : 0.72,
        codeReading.brand
          ? `Код двигателя ${codeReading.code} — ${codeReading.brand}`
          : `Похоже на код двигателя ${codeReading.code}`,
        "rules",
      ),
    };
  }

  // 3) Keyword rules — cover gaps the dictionary does not.
  const keyword =
    keywordMatch(fold(values.name ?? "")) ??
    keywordMatch(fold([query, values.comment].filter(Boolean).join(" "))) ??
    keywordMatch(folded);
  if (keyword) {
    return {
      recordType: keyword.type,
      target: RECORD_TYPE_TARGET[keyword.type],
      confidence: makeConfidence(keyword.score, "Определено по ключевым словам", "rules"),
    };
  }

  // 4) Weak dictionary hint, still better than nothing.
  if (bestDict && bestDict.score >= 0.36) {
    const recordType = bestDict.type === "body" ? refineBodyType(folded) : bestDict.type;
    return {
      recordType,
      target: RECORD_TYPE_TARGET[recordType],
      confidence: makeConfidence(bestDict.score, "Частичное совпадение со словарём", "dictionary"),
      matchedEntry: bestDict.entry,
    };
  }

  // Unknown — caller may route to AI.
  return {
    recordType: "unknown",
    target: RECORD_TYPE_TARGET.unknown,
    confidence: makeConfidence(0.3, "Не удалось определить тип записи", "rules"),
  };
}
