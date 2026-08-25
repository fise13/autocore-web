/**
 * Make a call title safe to put in an HTTP header.
 *
 * OpenRouter takes the product label in a header — `X-Title` on the direct
 * path, `x-ai-title` through the proxy — and header values are ByteStrings.
 * `fetch` throws on any character above 255 before a request is even attempted:
 *
 *   Cannot convert argument to a ByteString because the character at index 25
 *   has a value of 8212 which is greater than 255.
 *
 * 8212 is an em dash. The business-import passes labelled themselves
 * "AutoCore Business Import — discovery", so every AI call in that import
 * threw instantly, every pass fell back to its empty answer, and the import
 * quietly reported "ИИ-анализ недоступен". The model was never asked anything.
 *
 * Sanitizing here rather than editing those five strings is the point: a title
 * is a human-written label, someone will eventually write a Cyrillic or dashed
 * one, and a label has no business being able to disable the AI.
 */

/** Header values are ByteStrings; the label is also not worth many bytes. */
const MAX_TITLE_LENGTH = 120;

/** Typographic characters worth keeping as their ASCII equivalent. */
const TRANSLITERATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[—–‒―]/g, "-"],
  [/[’‘‚‛]/g, "'"],
  [/[“”„‟«»]/g, '"'],
  [/[…]/g, "..."],
  [/[·•]/g, "-"],
  [/ /g, " "],
];

export function headerSafeTitle(title: string, fallback = "AutoCore"): string {
  let value = title;
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    value = value.replace(pattern, replacement);
  }

  // Anything still outside printable ASCII goes: a Cyrillic label is not worth
  // a failed request, and control characters would let a title forge a header.
  value = value
    .replace(/[^\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
    .trim();

  return value || fallback;
}
