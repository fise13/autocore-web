import { sanitizeGridText, isGridPlaceholder } from "@/lib/import/ai-grid-contract";
import { normalizeEngineCode } from "@/lib/motors/import-normalization";

/**
 * Dismantling sheets keep the engine family and the engine number in one cell:
 * `EJ251- 442063`, `N62 B44- 155232200`, `EZ 3.6- U243139`, `K4M- A752- D036996`.
 *
 * The grid has separate ENGINE and ENGINE NUMBER columns, so the cell has to be split
 * before anything else can be decided about the row.
 */

export type EngineNumberParts = {
  /** Normalized family code (`ej251`), empty when the cell carried only a serial. */
  engineCode: string;
  /** The serial alone, source casing preserved. Empty for `???`-style cells. */
  serialCode: string;
  /** Segments that were neither family nor serial (`A752`, `АКПП`) — go to configuration. */
  extras: string[];
  /** The cell named a serial but the value was a placeholder (`VQ40- ???`). */
  serialPlaceholder: boolean;
};

/** `- ` / `– ` / `— ` — a dash followed by whitespace separates family from serial. */
const SPACED_DASH = /\s*[-–—]\s+/;

/**
 * Shapes real engine families take in JDM/EU dismantling catalogs.
 * Deliberately tight: engine numbers in these files are 1–2 letters plus 4–8 digits,
 * which none of these patterns accept.
 */
const FAMILY_SHAPES: RegExp[] = [
  // EJ251, FB25, EZ30, N62, K4M, G6BA, VK56, H27A, Z18XER, VQ35HR, EJ253AVCS
  /^[A-Z]{1,4}\d{1,3}(\.\d)?[A-Z]{0,6}$/i,
  // 6G72, 4G63, 1KZ, 2KD, 3GR, 2JZ, 1UR, 13B
  /^\d{1,2}[A-Z]{1,3}\d{0,3}[A-Z]{0,4}$/i,
  // F18D4, N624.8 — letters, digits, letters, digits (dashes already stripped by compact)
  /^[A-Z]{1,4}\d{1,3}[A-Z]{1,4}\d{1,3}(\.\d)?[A-Z]{0,4}$/i,
];

/** Subaru sheets abbreviate EJ2xx to the bare number: `253AVCS`, `204AVCS`, `205`, `20J`, `25D`. */
const SUBARU_BARE_FAMILY = /^(2\d{2}|2\d|20[A-Z]|25[A-Z]|1\d{2})([A-Z]{2,6})?$/i;

/** `D4` in "F18 D4", `B44` in "N62 B44" — a block suffix, not a family of its own. */
const SUFFIX_TOKEN = /^[A-Z]{1,2}\d{1,3}(\.\d)?$/i;

/** Wordy suffixes that are genuinely part of the family name, unlike TURBO / NEW / DIESEL. */
const FAMILY_SUFFIX_WORD = /^(AVCS|VVT|VVTI|DOHC|SOHC|GTE|GE|DE|DET|TT)$/i;

/**
 * Family codes are written with stray spaces and dashes ("EJ 253 AVCS", "N62-4.8", "EJ-254");
 * the shape tests and the Subaru expansion both work on the packed form.
 */
function compact(value: string): string {
  return value.replace(/[\s-]+/g, "");
}

function looksLikeSerial(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 4) return false;
  if (!/[A-Za-z0-9]/.test(trimmed)) return false;
  // Dates are never serials.
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(trimmed)) return false;
  return true;
}

/** A standalone token that names an engine family rather than an engine number. */
export function looksLikeEngineFamily(
  value: string,
  options?: { subaruContext?: boolean },
): boolean {
  const trimmed = sanitizeGridText(value);
  if (!trimmed) return false;
  const packed = compact(trimmed);
  if (packed.length > 12) return false;
  if (!/\d/.test(packed)) return false;
  if (options?.subaruContext && SUBARU_BARE_FAMILY.test(packed)) return true;
  return FAMILY_SHAPES.some((shape) => shape.test(packed));
}

/**
 * `253AVCS` → `ej253avcs` on a Subaru sheet; everything else passes through
 * {@link normalizeEngineCode} unchanged.
 */
export function normalizeFamilyCode(raw: string, options?: { subaruContext?: boolean }): string {
  const trimmed = sanitizeGridText(raw);
  if (!trimmed) return "";
  const packed = compact(trimmed);
  if (options?.subaruContext && SUBARU_BARE_FAMILY.test(packed) && !/^[A-Z]{2}/i.test(packed)) {
    return normalizeEngineCode(`EJ${packed}`);
  }
  return normalizeEngineCode(trimmed);
}

type FamilyWalk = {
  families: string[];
  /** Tokens that were not part of any family — never dropped, they go to configuration. */
  leftovers: string[];
};

/**
 * Walk one space-separated phrase and collect the engine families in it.
 *
 * Handles the three ways these files write a family across tokens:
 * a bare prefix (`EJ 251`), a block suffix (`N62 B44`, `F18 D4`) and a variant word
 * (`EJ253 AVCS`). Everything else — TURBO, NEW, DIESEL, PLAST — falls out as a leftover.
 */
function walkFamilyTokens(
  phrase: string,
  options: { subaruContext?: boolean; carryPrefix?: string } = {},
): FamilyWalk & { prefix: string } {
  const families: string[] = [];
  const leftovers: string[] = [];
  let prefix = options.carryPrefix ?? "";
  let previousRaw: string | null = null;

  const push = (code: string) => {
    if (code && !families.includes(code)) families.push(code);
  };

  for (const token of phrase.split(" ").filter(Boolean)) {
    if (!/\d/.test(token)) {
      if (previousRaw && FAMILY_SUFFIX_WORD.test(token)) {
        const previousCode = normalizeFamilyCode(previousRaw, options);
        const merged = normalizeFamilyCode(`${previousRaw}${token}`, options);
        const index = families.indexOf(previousCode);
        if (index >= 0) families[index] = merged;
        else push(merged);
        previousRaw = `${previousRaw}${token}`;
        continue;
      }
      if (/^[A-Z]{1,4}$/i.test(token)) {
        prefix = token.toUpperCase();
      } else {
        leftovers.push(token);
      }
      previousRaw = null;
      continue;
    }

    if (previousRaw && SUFFIX_TOKEN.test(token)) {
      const previousCode = normalizeFamilyCode(previousRaw, options);
      const merged = normalizeFamilyCode(`${previousRaw}${token}`, options);
      const index = families.indexOf(previousCode);
      if (index >= 0) families[index] = merged;
      else push(merged);
      previousRaw = `${previousRaw}${token}`;
      continue;
    }

    const candidate = /^\d/.test(token) && prefix ? `${prefix}${token}` : token;
    if (!looksLikeEngineFamily(candidate, options)) {
      leftovers.push(token);
      previousRaw = null;
      continue;
    }

    const prefixMatch = candidate.match(/^([A-Z]{1,4})/i);
    if (prefixMatch) prefix = prefixMatch[1].toUpperCase();

    push(normalizeFamilyCode(candidate, options));
    previousRaw = candidate;
  }

  return { families, leftovers, prefix };
}

function splitOnLastBareDash(value: string): [string, string] | null {
  const index = value.lastIndexOf("-");
  if (index <= 0 || index === value.length - 1) return null;
  return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
}

/** Read the family (and any stray words) out of the part before the serial. */
function parseFamilyHead(
  head: string,
  options?: { subaruContext?: boolean },
): { engineCode: string; leftovers: string[] } {
  const walk = walkFamilyTokens(head, options ?? {});
  return {
    engineCode: walk.families[0] ?? "",
    leftovers: [...walk.families.slice(1), ...walk.leftovers],
  };
}

/**
 * Split one ENGINE NUMBER cell into its grid parts.
 *
 * `subaruContext` turns on the bare-EJ2xx expansion; pass it when the sheet, its title
 * or the active section says Subaru.
 */
export function parseEngineNumberCell(
  raw: string,
  options?: { subaruContext?: boolean },
): EngineNumberParts {
  const empty: EngineNumberParts = {
    engineCode: "",
    serialCode: "",
    extras: [],
    serialPlaceholder: false,
  };

  const cell = String(raw ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cell) return empty;
  if (isGridPlaceholder(cell)) return { ...empty, serialPlaceholder: true };

  const subaru = options?.subaruContext ?? false;
  const opts = { subaruContext: subaru };

  const dashParts = cell.split(SPACED_DASH).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    const head = dashParts[0];
    const tail = dashParts[dashParts.length - 1];
    const middle = dashParts.slice(1, -1);
    const tailIsPlaceholder = isGridPlaceholder(tail);
    const parsedHead = parseFamilyHead(head, opts);

    return {
      engineCode: parsedHead.engineCode,
      serialCode: tailIsPlaceholder ? "" : tail,
      // A head that is not a family at all (`АКПП- TZ1A3`) survives as an extra.
      extras: [...parsedHead.leftovers, ...middle],
      serialPlaceholder: tailIsPlaceholder,
    };
  }

  // `EJ-254 C392527` — family and serial separated by a plain space.
  const spaceParts = cell.split(" ").filter(Boolean);
  if (spaceParts.length === 2) {
    const [head, tail] = spaceParts;
    if (looksLikeEngineFamily(head, opts) && looksLikeSerial(tail) && !looksLikeEngineFamily(tail, opts)) {
      return {
        engineCode: normalizeFamilyCode(head, opts),
        serialCode: tail,
        extras: [],
        serialPlaceholder: false,
      };
    }
  }

  // `K4M-???` — dash with no space after it.
  const bare = splitOnLastBareDash(cell);
  if (bare) {
    const [head, tail] = bare;
    const tailIsPlaceholder = isGridPlaceholder(tail);
    if (
      looksLikeEngineFamily(head, opts) &&
      !looksLikeEngineFamily(cell, opts) &&
      (tailIsPlaceholder || looksLikeSerial(tail))
    ) {
      return {
        engineCode: normalizeFamilyCode(head, opts),
        serialCode: tailIsPlaceholder ? "" : tail,
        extras: [],
        serialPlaceholder: tailIsPlaceholder,
      };
    }
  }

  // Single token. A family on its own is context (a section header), never a serial.
  if (looksLikeEngineFamily(cell, opts) && !looksLikeSerial(cell)) {
    return {
      engineCode: normalizeFamilyCode(cell, opts),
      serialCode: "",
      extras: [],
      serialPlaceholder: false,
    };
  }

  return { engineCode: "", serialCode: cell, extras: [], serialPlaceholder: false };
}

/**
 * Pull every engine family named by a sheet tab or its title row.
 *
 * `EJ 20X-20J-22-25D` → `["ej20x", "ej20j", "ej22", "ej25d"]`
 * `SUBARU-EZ30 NEW, EZ3.6` → `["ez30", "ez36"]`
 * `CRUZE-F18 D4- Z18XER` → `["f18d4", "z18xer"]`
 *
 * Bare numeric segments inherit the previous segment's letter prefix, which is how these
 * tabs are written: `FB 20-16` means FB20 and FB16.
 */
export function parseEngineFamilyList(
  label: string,
  options?: { subaruContext?: boolean },
): string[] {
  const cleaned = sanitizeGridText(label);
  if (!cleaned) return [];

  const segments = cleaned
    .split(/[,/_]|\s*[-–—]\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const families: string[] = [];
  let prefix = "";

  for (const segment of segments) {
    const walk = walkFamilyTokens(segment, { ...options, carryPrefix: prefix });
    prefix = walk.prefix;
    for (const family of walk.families) {
      if (!families.includes(family)) families.push(family);
    }
  }

  return families;
}
