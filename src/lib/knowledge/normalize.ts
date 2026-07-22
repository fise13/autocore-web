import { compact } from "@/lib/domain/normalize";

/**
 * Fold free text into a stable lookup key for patterns/dictionary entries.
 * Reuses the Domain Engine's Cyrillic-aware folding so "Субару" / "subaru"
 * collapse onto the same key.
 */
export function normalizeKey(text: string): string {
  return compact(text ?? "");
}

/** Engine/gearbox codes vary in casing and separators ("EJ-205", "ej 205", "EJ_205"). */
export function normalizeEngineCode(code: string): string {
  return (code ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-._/\\]+/g, "");
}

/** SKUs are case-insensitive and separator-tolerant, like engine codes. */
export function normalizeSku(sku: string): string {
  return (sku ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}
