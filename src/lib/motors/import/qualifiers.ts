import {
  GRID_FRAGMENT_SEPARATOR,
  joinGridFragments,
  sanitizeGridText,
} from "@/lib/import/ai-grid-contract";

/**
 * Operational qualifiers — where an engine has been, not what it is.
 *
 * Dismantling workbooks track movement by writing it into whatever cell is free:
 * a tab called «ПОСЛЕ ДЭНА», a section heading «МОТОРЫ ПОСЛЕ ДЭНА», or a note
 * «СВЕРДЛОВА 26.09.2024». All of it belongs in the CONFIGURATION column of the grid,
 * so the engine's identity columns stay clean and the history stays visible.
 */

export type MotorQualifier = {
  id: string;
  /** Canonical label written into CONFIGURATION when the sheet itself is the source. */
  label: string;
  /** Matches the qualifier anywhere in a free-text cell. */
  pattern: RegExp;
};

/**
 * `\w` does not cover Cyrillic, so word tails are matched with an explicit class —
 * otherwise «СВЕРДЛОВА» is captured as the stump «СВЕРДЛОВ».
 */
const RU = "[А-Яа-яЁё]";

export const MOTOR_OPERATIONAL_QUALIFIERS: MotorQualifier[] = [
  { id: "after-den", label: "ПОСЛЕ ДЭНА", pattern: new RegExp(`ПОСЛЕ\\s+(ДЭНА|ДЕНА|ДАНИКА|ДАНИЯРА)`, "gi") },
  { id: "repair-den", label: "РЕМОНТ ДЭН", pattern: new RegExp(`(РЕМОНТ\\s+(ДЭН${RU}*|ДАНИЯР${RU}*)|К\\s+(ДЭНУ|ДАНИКУ))`, "gi") },
  { id: "repair-tolya", label: "РЕМОНТ ТОЛЯ", pattern: new RegExp(`РЕМОНТ\\s+ТОЛ${RU}*`, "gi") },
  { id: "sverdlova", label: "СВЕРДЛОВА", pattern: new RegExp(`СВЕРДЛОВ${RU}*`, "gi") },
  { id: "trade-warehouse", label: "ТОРГОВЫЙ СКЛАД", pattern: new RegExp(`ТОРГОВ${RU}*\\s+СКЛАД${RU}*`, "gi") },
  { id: "return", label: "ВОЗВРАТ", pattern: new RegExp(`(ВОЗВРАТ${RU}*|ВЕРНУЛ${RU}*|\\bRETURN\\b|\\bBACK\\b)`, "gi") },
  { id: "to-repair", label: "НА РЕМОНТ", pattern: new RegExp(`НА\\s+РЕМОНТ${RU}*`, "gi") },
  { id: "write-off", label: "НА СПИСАНИЕ", pattern: new RegExp(`(НА\\s+СПИСАНИЕ|УТИЛ[ЬЯ]${RU}*)`, "gi") },
  { id: "for-parts", label: "НА ЗАПЧАСТИ", pattern: new RegExp(`НА\\s+ЗАПЧАСТ${RU}*`, "gi") },
  { id: "installation", label: "УСТАНОВКА", pattern: new RegExp(`УСТАНОВК${RU}*(\\s+${RU}+)?`, "gi") },
  { id: "customer", label: "КЛИЕНТСКИЙ", pattern: new RegExp(`КЛИЕНТСК${RU}*`, "gi") },
];

/** Sheet tab (or title row) names that are movement logs rather than stock lists. */
const SHEET_QUALIFIERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ПОСЛЕ\s+(ДЭНА|ДЕНА|ДАНИКА)/i, label: "ПОСЛЕ ДЭНА" },
  { pattern: /РЕМОНТ\s+(ДЭН|ДАНИЯР)/i, label: "РЕМОНТ ДЭН" },
  { pattern: /РЕМОНТ\s+ТОЛ/i, label: "РЕМОНТ ТОЛЯ" },
  { pattern: /^НА\s+РЕМОНТ/i, label: "НА РЕМОНТ" },
  { pattern: /ВОЗВРАТ/i, label: "ВОЗВРАТ" },
  { pattern: /СВЕРДЛОВ/i, label: "СВЕРДЛОВА" },
  { pattern: /ТОРГОВ\w*\s+СКЛАД/i, label: "ТОРГОВЫЙ СКЛАД" },
];

/**
 * The qualifier a whole sheet imposes on its rows, or "" for ordinary stock tabs.
 * Sold archives are deliberately not qualifiers — being sold is a state, not a place.
 */
export function qualifierFromSheetName(sheetName: string): string {
  const name = sanitizeGridText(sheetName);
  if (!name) return "";
  for (const entry of SHEET_QUALIFIERS) {
    if (entry.pattern.test(name)) return entry.label;
  }
  return "";
}

export type QualifierExtraction = {
  /** Qualifier phrases exactly as the source wrote them. */
  matches: string[];
  /** Ids of the qualifiers that matched — used to avoid saying the same thing twice. */
  ids: string[];
  /** The cell contains nothing but qualifiers, dates and punctuation. */
  pureQualifier: boolean;
};

/** Find operational qualifiers inside one free-text cell. */
export function extractQualifiers(text: string): QualifierExtraction {
  const value = sanitizeGridText(text);
  if (!value) return { matches: [], ids: [], pureQualifier: false };

  const matches: string[] = [];
  const ids: string[] = [];
  let residue = value;

  for (const qualifier of MOTOR_OPERATIONAL_QUALIFIERS) {
    const pattern = new RegExp(qualifier.pattern.source, qualifier.pattern.flags);
    const found = value.match(pattern);
    if (!found) continue;
    ids.push(qualifier.id);
    for (const hit of found) {
      const trimmed = hit.trim();
      if (trimmed && !matches.includes(trimmed)) matches.push(trimmed);
    }
    residue = residue.replace(pattern, " ");
  }

  if (matches.length === 0) return { matches: [], ids: [], pureQualifier: false };

  // Whatever is left after removing the qualifiers: dates, separators and nothing else
  // means the cell was only about movement.
  const leftover = residue
    .replace(/\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}/g, " ")
    .replace(/\d{4}-\d{2}-\d{2}/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  return { matches, ids, pureQualifier: leftover.length === 0 };
}

/**
 * Route one free-text cell between CONFIGURATION and SPECIAL NOTES.
 *
 * A cell that is only movement (`СВЕРДЛОВА 26.09.2024`) moves wholesale into
 * configuration. A mixed cell (`SOLD. ВЕРНУЛСЯ 14.10.2024`) keeps its note intact and
 * copies just the qualifier across, so nothing is lost either way.
 */
export type QualifierRouting = { configuration: string; notes: string; ids: string[] };

export function routeQualifierText(text: string): QualifierRouting {
  const value = sanitizeGridText(text);
  if (!value) return { configuration: "", notes: "", ids: [] };

  const { matches, ids, pureQualifier } = extractQualifiers(value);
  if (matches.length === 0) return { configuration: "", notes: value, ids: [] };
  if (pureQualifier) return { configuration: value, notes: "", ids };
  return { configuration: joinGridFragments(matches), notes: value, ids };
}

/**
 * Drop the parts of a sheet-level qualifier the row already states itself.
 *
 * Without this, a row on the СВЕРДЛОВА tab that says «СВЕРДЛОВА 29.07.24» would render as
 * "СВЕРДЛОВА 29.07.24 · СВЕРДЛОВА" — the same fact twice, once without its date.
 */
export function dropRedundantSheetQualifier(sheetQualifier: string, seenIds: string[]): string {
  const value = sanitizeGridText(sheetQualifier);
  if (!value || seenIds.length === 0) return value;

  const seen = new Set(seenIds);
  const kept = value
    .split(" · ")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const owner = MOTOR_OPERATIONAL_QUALIFIERS.find((qualifier) => qualifier.label === part);
      return !owner || !seen.has(owner.id);
    });

  return kept.join(" · ");
}

/** A fragment that is nothing but the qualifier word — no date, no extra detail. */
function isBareQualifierFragment(fragment: string, ids: string[]): boolean {
  if (ids.length === 0) return false;
  let residue = fragment;
  for (const qualifier of MOTOR_OPERATIONAL_QUALIFIERS) {
    if (!ids.includes(qualifier.id)) continue;
    residue = residue.replace(new RegExp(qualifier.pattern.source, qualifier.pattern.flags), " ");
  }
  return !/[\p{L}\p{N}]/u.test(residue);
}

/**
 * Tidy a CONFIGURATION cell assembled from several sheets.
 *
 * Merging an engine's rows collects the same movement several times: the sheet contributes
 * a bare "СВЕРДЛОВА" while a row contributes "СВЕРДЛОВА 26.09.2024", and a return shows up
 * as "ВЕРНУЛСЯ", "RETURN" and "возврат" at once. Dated and detailed fragments are kept;
 * bare repeats of the same qualifier are dropped.
 */
export function compactQualifierFragments(text: string): string {
  const value = sanitizeGridText(text);
  if (!value) return "";

  const fragments = value
    .split(GRID_FRAGMENT_SEPARATOR)
    .map((part) => sanitizeGridText(part))
    .filter(Boolean)
    .map((fragment) => {
      const { ids } = extractQualifiers(fragment);
      return { fragment, ids, bare: isBareQualifierFragment(fragment, ids) };
    });

  const informative = new Set<string>();
  for (const entry of fragments) {
    if (entry.ids.length > 0 && !entry.bare) {
      for (const id of entry.ids) informative.add(id);
    }
  }

  const keptBare = new Set<string>();
  const kept: string[] = [];

  for (const entry of fragments) {
    if (entry.ids.length === 0 || !entry.bare) {
      kept.push(entry.fragment);
      continue;
    }
    const alreadyCovered = entry.ids.every((id) => informative.has(id) || keptBare.has(id));
    if (alreadyCovered) continue;
    for (const id of entry.ids) keptBare.add(id);
    kept.push(entry.fragment);
  }

  return kept.join(GRID_FRAGMENT_SEPARATOR);
}
