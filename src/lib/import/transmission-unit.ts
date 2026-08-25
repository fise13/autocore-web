/**
 * Telling a gearbox apart from an engine on a sheet of engines.
 *
 * A motor catalog is not purely motors. The same book carries the odd
 * `AKPP- TZ1A4- 40ZU…` or `MKPP- …` line, and because the sheet was recognised
 * as an engine catalog, every row on it was classified `engine`. Gearboxes
 * ended up in the Engines grid — the Volvo and Mitsubishi rows in the stock
 * list are both transmissions.
 *
 * The signal used here is only the explicit word: АКПП / AKPP / МКПП / MKPP /
 * CVT / вариатор / коробка. OEM gearbox serial prefixes (TZ1A4, TR580, JF…)
 * are deliberately *not* treated as proof on their own — they overlap with
 * engine-code shapes, and demoting a real engine to a part is worse than
 * leaving one gearbox among the engines for a human to move.
 *
 * Pure — no I/O.
 */

/** Explicit transmission words, in both alphabets. */
const TRANSMISSION_WORDS = [
  "акпп",
  "мкпп",
  "akpp",
  "mkpp",
  "кпп",
  "коробка",
  "вариатор",
  "cvt",
  "gearbox",
  "transmission",
] as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Whether this row describes a gearbox rather than an engine.
 *
 * Only the head of the value is inspected: a note reading "с АКПП" describes
 * the car the engine came out of, not the unit being sold, and must not turn
 * the engine into a gearbox.
 */
export function looksLikeTransmissionUnit(
  value: string | null | undefined,
): boolean {
  const text = normalize(String(value ?? ""));
  if (!text) return false;
  // The unit word leads the cell, followed by a separator or the end.
  const head = text.match(/^([\p{L}]+)/u)?.[1] ?? "";
  return TRANSMISSION_WORDS.includes(head as (typeof TRANSMISSION_WORDS)[number]);
}

/** The first value on the row that names a gearbox, if any. */
export function transmissionSignalFrom(
  values: ReadonlyArray<string | null | undefined>,
): string | null {
  for (const value of values) {
    if (looksLikeTransmissionUnit(value)) return String(value).trim();
  }
  return null;
}
