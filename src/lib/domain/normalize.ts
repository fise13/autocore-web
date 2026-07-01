/**
 * Text normalization for the Domain Engine.
 *
 * Goal: make "субару", "Subaru", "sub", "субар" and "ej-205" all resolvable
 * against the same canonical entries. We achieve this by folding text into a
 * separator-free lowercase form and by transliterating Cyrillic into a Latin
 * canonical form, so a single comparison space covers both scripts.
 */

/** Phonetic Cyrillic → Latin map (lossy but stable for matching). */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

const HAS_CYRILLIC = /[а-яё]/i;
const HAS_LATIN = /[a-z]/i;

/**
 * Fold text into a comparable key: lowercase, strip diacritics and the
 * separators that automotive codes scatter around ("EJ-205" → "ej205"), and
 * collapse whitespace. Whitespace is preserved as single spaces so callers can
 * still split into words when needed.
 */
export function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._/\\,]+/g, "")
    .replace(/[-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Like {@link fold} but also removes spaces — a single compact token. */
export function compact(value: string): string {
  return fold(value).replace(/\s+/g, "");
}

/** Transliterate Cyrillic characters to Latin; leaves Latin untouched. */
export function transliterate(value: string): string {
  let out = "";
  for (const char of value.toLowerCase()) {
    out += CYRILLIC_TO_LATIN[char] ?? char;
  }
  return out;
}

/**
 * Produce the set of normalized keys a term should be searchable under.
 * Always includes the folded form; for Cyrillic input it adds the Latin
 * transliteration so "субару" and "subaru" collapse together.
 */
export function normalizedVariants(value: string): string[] {
  const variants = new Set<string>();
  const folded = compact(value);
  if (folded) variants.add(folded);

  if (HAS_CYRILLIC.test(value)) {
    const lat = compact(transliterate(value));
    if (lat) variants.add(lat);
  }

  return [...variants];
}

/** Split a phrase into folded word tokens (for word-prefix / substring index). */
export function tokenize(value: string): string[] {
  const tokens = new Set<string>();
  for (const raw of fold(value).split(" ")) {
    if (!raw) continue;
    tokens.add(raw.replace(/\s+/g, ""));
    if (HAS_CYRILLIC.test(raw)) {
      const lat = compact(transliterate(raw));
      if (lat) tokens.add(lat);
    }
  }
  return [...tokens];
}

export function hasCyrillic(value: string): boolean {
  return HAS_CYRILLIC.test(value);
}

export function hasLatin(value: string): boolean {
  return HAS_LATIN.test(value);
}

/**
 * Bounded Levenshtein distance. Returns a number greater than `max` as soon as
 * the distance is known to exceed the budget, so typo checks stay cheap.
 */
export function levenshtein(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j += 1) prev[j] = j;

  for (let i = 1; i <= al; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j += 1) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }

  return prev[bl];
}

/** Typo budget scaled to query length: short queries tolerate fewer edits. */
export function typoBudget(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}
