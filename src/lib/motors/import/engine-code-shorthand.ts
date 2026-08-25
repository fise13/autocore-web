import { inferBrandFromEngineCode } from "@/lib/motors/import/brand-engine-intelligence";

/**
 * Reading an engine code out of the way a dismantling shop actually writes it.
 *
 * Real stock sheets do not carry a tidy "engine code" column. They carry one
 * «НОМЕР» column holding the code welded to the unit number —
 * `EJ251- C085834` — and, when the whole shop is Subaru, they drop the family
 * prefix entirely and write `253AVCS- 810404`. Neither form was understood, so
 * 5142 rows imported as Untitled with no brand, no category and no name.
 *
 * Two readings are supported, and nothing else is guessed:
 *
 *  - **Prefix.** Letters-then-digits at the head of the value, before the
 *    separator: `EJ251- C085834` → `EJ251`, `2JZ-GTE 0123456` → `2JZ-GTE`.
 *  - **Subaru shorthand.** Digits followed by a marker that only Subaru
 *    uses — AVCS (Active Valve Control System) or AVLS — expand back to the
 *    EJ family: `253AVCS` → `EJ253`.
 *
 * A bare number is deliberately *not* read. `253` on its own could be a family
 * number, a displacement, a shelf, or a quantity, and inventing `EJ253` from it
 * would put wrong engines in the catalogue — worse than leaving the row for a
 * human. The AVCS/AVLS marker is what makes the shorthand unambiguous.
 *
 * Pure — no I/O, no dictionary lookups beyond the prefix→brand table.
 */

export type EngineCodeSource = "explicit" | "serial-prefix" | "subaru-shorthand";

export type EngineCodeReading = {
  /** Canonical engine code, upper case, separators normalized. */
  code: string;
  /** Manufacturer the code identifies, when the prefix table knows it. */
  brand: string | null;
  /** Variant marker written alongside the code, e.g. "AVCS". */
  variant: string | null;
  source: EngineCodeSource;
};

/** Markers only Subaru puts on an engine, which make a bare number readable. */
const SUBARU_MARKERS = ["AVCS", "AVLS"] as const;

/** Variant words a shop appends that are not part of the code itself. */
const VARIANT_MARKERS = [...SUBARU_MARKERS, "DOHC", "SOHC", "TURBO", "TWINTURBO", "NA"] as const;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Subaru's EJ family numbers, as written without the prefix. Restricting the
 * expansion to real family numbers stops `999AVCS` becoming `EJ999`.
 */
const SUBARU_EJ_FAMILY = new Set([
  "18", "20", "201", "202", "203", "204", "205", "206", "207", "208",
  "22", "25", "251", "252", "253", "254", "255", "257",
]);

function readSubaruShorthand(token: string): EngineCodeReading | null {
  const match = token.match(/^(\d{2,3})\s*-?\s*(AVCS|AVLS)$/i);
  if (!match) return null;
  const digits = match[1]!;
  if (!SUBARU_EJ_FAMILY.has(digits)) return null;
  return {
    code: `EJ${digits}`,
    brand: "Subaru",
    variant: match[2]!.toUpperCase(),
    source: "subaru-shorthand",
  };
}

function splitVariant(token: string): { core: string; variant: string | null } {
  for (const marker of VARIANT_MARKERS) {
    const pattern = new RegExp(`[\\s-]*${marker}$`, "i");
    if (pattern.test(token)) {
      return { core: token.replace(pattern, ""), variant: marker };
    }
  }
  return { core: token, variant: null };
}

/**
 * The leading token of a value, i.e. everything before the first separator
 * that starts the unit number. `EJ251- C085834` → `EJ251`.
 */
function leadingToken(value: string): string {
  const compact = clean(value);
  // A space, dash, slash or underscore ends the code and starts the number.
  const match = compact.match(/^([A-Za-z0-9]+(?:-[A-Za-z]+)?)(?=[\s\-_/]|$)/);
  return match?.[1] ?? "";
}

/**
 * Read an engine code out of a raw cell — a serial, a name, or a code column.
 * Returns null when nothing can be read without guessing.
 */
export function readEngineCode(value: string | null | undefined): EngineCodeReading | null {
  const raw = clean(String(value ?? ""));
  if (!raw || raw === "—" || raw === "-" || raw.toUpperCase() === "N/A") return null;

  const head = leadingToken(raw);
  if (!head) return null;

  // `253AVCS` and `253 AVCS` — check before the generic path, which would read
  // the digits alone and find no brand.
  const shorthandToken = raw.match(/^(\d{2,3}\s*-?\s*(?:AVCS|AVLS))/i)?.[1] ?? head;
  const shorthand = readSubaruShorthand(shorthandToken.replace(/\s+/g, ""));
  if (shorthand) return shorthand;

  const { core, variant } = splitVariant(head);
  // A real code has letters and digits: EJ251, 2JZ-GTE, 4G63, N54B30.
  if (!/[A-Za-z]/.test(core) || !/\d/.test(core)) return null;
  if (core.length > 12) return null;

  const code = core.toUpperCase();
  return {
    code,
    brand: inferBrandFromEngineCode(code),
    variant,
    // "explicit" when the cell is only the code; otherwise it was carrying a
    // unit number too and we took the prefix.
    source: clean(raw).toUpperCase() === code ? "explicit" : "serial-prefix",
  };
}

/**
 * The display name an imported engine should get: `Subaru EJ253 AVCS`, or just
 * the code when the brand is unknown. Never returns an empty string for a
 * readable code, which is what left rows showing as "Untitled".
 */
export function engineDisplayName(reading: EngineCodeReading): string {
  return [reading.brand, reading.code, reading.variant].filter(Boolean).join(" ");
}

/** How many of these values read as engine codes — used to sniff a column. */
export function countEngineCodeValues(values: readonly string[]): number {
  let count = 0;
  for (const value of values) {
    if (readEngineCode(value)) count += 1;
  }
  return count;
}
