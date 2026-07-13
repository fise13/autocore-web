/** Canonical customer-facing mark when a motor is sold/installed with a gearbox. */
export const GEARBOX_MARK = "с коробкой";

const GEARBOX_PHRASE_RE =
  /\b(?:s\s*korobk[oaoy]+|c\s*korobk[oaoy]+|with\s*gear\s*box|with\s*gearbox|с\s*коробк\w*|в\s*комплекте\s*с\s*коробк\w*)\b/gi;

const SEPARATOR_RE = /\s*[·•|/,;]\s*|\s{2,}/g;

export type PolishedMotorFields = {
  brandName: string;
  engineCode: string;
  configuration: string;
  serialCode: string;
  marks: string[];
  displayTitle: string;
};

export type PolishedPartFields = {
  name: string;
  marks: string[];
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Remove consecutive duplicate tokens (case-insensitive), e.g. "BMW BMW" → "BMW". */
export function dedupeAdjacentTokens(value: string): string {
  const tokens = collapseWhitespace(value).split(" ").filter(Boolean);
  const out: string[] = [];
  for (const token of tokens) {
    const prev = out[out.length - 1];
    if (prev && prev.toLowerCase() === token.toLowerCase()) continue;
    out.push(token);
  }
  return out.join(" ");
}

function normalizeSeparators(value: string): string {
  return collapseWhitespace(value.replace(SEPARATOR_RE, " "));
}

/**
 * Strip gearbox phrases from free text and collect the canonical mark.
 * Returns cleaned text + whether a gearbox mark was found.
 */
export function extractGearboxMark(value: string): { cleaned: string; hasGearbox: boolean } {
  let hasGearbox = false;
  const cleaned = collapseWhitespace(
    value.replace(GEARBOX_PHRASE_RE, () => {
      hasGearbox = true;
      return " ";
    }),
  );
  return { cleaned: dedupeAdjacentTokens(normalizeSeparators(cleaned)), hasGearbox };
}

function cleanField(value: string | null | undefined): { text: string; hasGearbox: boolean } {
  const raw = (value ?? "").trim();
  if (!raw) return { text: "", hasGearbox: false };
  const extracted = extractGearboxMark(raw);
  return { text: extracted.cleaned, hasGearbox: extracted.hasGearbox };
}

export function polishMotorFieldsDeterministic(input: {
  brandName?: string | null;
  engineCode?: string | null;
  configuration?: string | null;
  serialCode?: string | null;
}): PolishedMotorFields {
  const brand = cleanField(input.brandName);
  const engine = cleanField(input.engineCode);
  const configuration = cleanField(input.configuration);
  const serial = cleanField(input.serialCode);

  const marks: string[] = [];
  if (brand.hasGearbox || engine.hasGearbox || configuration.hasGearbox || serial.hasGearbox) {
    marks.push(GEARBOX_MARK);
  }

  let brandName = brand.text;
  let engineCode = engine.text;
  let configurationText = configuration.text;
  const serialCode = serial.text;

  // If brand absorbed a whole "Brand · junk · code · serial" blob, keep cleaned tokens as display.
  // Prefer moving a leftover engine-like token into engineCode when engine was only a gearbox phrase.
  if (!engineCode && configurationText) {
    const configTokens = configurationText.split(" ").filter(Boolean);
    const engineLike = configTokens.find((token) => /^[A-Za-z]{1,4}\d{1,4}[A-Za-z0-9-]*$/i.test(token));
    if (engineLike) {
      engineCode = engineLike;
      configurationText = dedupeAdjacentTokens(
        normalizeSeparators(configurationText.replace(new RegExp(`\\b${escapeRegExp(engineLike)}\\b`, "i"), " ")),
      );
    }
  }

  // Drop configuration fragments that duplicate brand/engine/serial.
  if (configurationText) {
    const lower = configurationText.toLowerCase();
    if (brandName && lower === brandName.toLowerCase()) configurationText = "";
    if (engineCode && lower === engineCode.toLowerCase()) configurationText = "";
    if (serialCode && lower === serialCode.toLowerCase()) configurationText = "";
  }

  // Remove serial from configuration when it was jammed into the name string.
  if (configurationText && serialCode) {
    configurationText = dedupeAdjacentTokens(
      normalizeSeparators(configurationText.replace(new RegExp(escapeRegExp(serialCode), "ig"), " ")),
    );
  }

  // Avoid repeating serial-looking tokens already present in brand after blob cleanup.
  if (brandName && serialCode && brandName.toLowerCase().includes(serialCode.toLowerCase())) {
    brandName = dedupeAdjacentTokens(
      normalizeSeparators(brandName.replace(new RegExp(escapeRegExp(serialCode), "ig"), " ")),
    );
  }
  if (brandName && engineCode && brandName.toLowerCase().includes(engineCode.toLowerCase())) {
    // keep brand + engine in displayParts; strip engine from brand to avoid "BMW N62 N62"
    brandName = dedupeAdjacentTokens(
      normalizeSeparators(brandName.replace(new RegExp(`\\b${escapeRegExp(engineCode)}\\b`, "ig"), " ")),
    );
  }

  const displayParts = [brandName, engineCode, configurationText].filter(Boolean);
  const displayTitle = displayParts.join(" ").trim() || serialCode || "Двигатель";

  return {
    brandName,
    engineCode,
    configuration: configurationText,
    serialCode,
    marks,
    displayTitle,
  };
}

export function polishPartNameDeterministic(name: string): PolishedPartFields {
  const { cleaned, hasGearbox } = extractGearboxMark(name);
  return {
    name: cleaned || name.trim(),
    marks: hasGearbox ? [GEARBOX_MARK] : [],
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
