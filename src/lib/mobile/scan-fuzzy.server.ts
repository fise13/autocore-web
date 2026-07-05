import { compact, levenshtein, typoBudget } from "@/lib/domain/normalize";

import type { MobileScanItem } from "./scan-types";

export type FuzzyScanCandidate = {
  item: MobileScanItem;
  score: number;
  reason: string;
};

const WEIGHTS = {
  exact: 1,
  prefix: 0.82,
  edit: 0.55,
  subsequence: 0.4,
  stock: 0.08,
} as const;

/** GTIN/EAN-style codes must match exactly — no prefix or typo guessing. */
export function isBarcodeLikeCode(value: string): boolean {
  const c = compact(value);
  if (c.length < 8) return false;
  if (/^\d{8,14}$/.test(c)) return true;
  return /^[A-Z0-9]{10,}$/i.test(c) && /\d{4,}/.test(c);
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return false;
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return false;
}

function stockSignal(item: MobileScanItem): number {
  if (item.totalAvailable > 0) return 1;
  if (item.totalOnHand > 0) return 0.5;
  return 0;
}

function scoreCode(query: string, code: string): { score: number; reason: string } | null {
  const q = compact(query);
  const c = compact(code);
  if (!q || !c) return null;
  if (q === c) return { score: WEIGHTS.exact, reason: "Точное совпадение кода" };

  if (isBarcodeLikeCode(query) || isBarcodeLikeCode(code)) {
    return null;
  }

  if (c.startsWith(q) || q.startsWith(c)) {
    return { score: WEIGHTS.prefix, reason: "Совпадение по префиксу" };
  }
  if (c.includes(q) || q.includes(c)) {
    return { score: WEIGHTS.prefix * 0.9, reason: "Частичное совпадение кода" };
  }
  const budget = typoBudget(q.length);
  const distance = levenshtein(q, c, budget);
  if (distance <= budget) {
    return {
      score: WEIGHTS.edit * (1 - distance / (budget + 1)),
      reason: `Похожий код (расстояние ${distance})`,
    };
  }
  if (isSubsequence(q, c)) {
    return { score: WEIGHTS.subsequence, reason: "Повреждённая этикетка" };
  }
  return null;
}

export function rankFuzzyScanCandidates(
  query: string,
  items: MobileScanItem[],
  limit = 5,
): FuzzyScanCandidate[] {
  const ranked: FuzzyScanCandidate[] = [];

  for (const item of items) {
    const codes = [item.sku, ...(item.barcodes ?? [])].filter(Boolean);
    let best: FuzzyScanCandidate | null = null;

    for (const code of codes) {
      const scored = scoreCode(query, code);
      if (!scored) continue;
      const total = scored.score + WEIGHTS.stock * stockSignal(item);
      const candidate: FuzzyScanCandidate = {
        item,
        score: total,
        reason: scored.reason,
      };
      if (!best || candidate.score > best.score) best = candidate;
    }

    const nameScore = scoreCode(query, item.name);
    if (nameScore && nameScore.score >= WEIGHTS.prefix * 0.85 && !isBarcodeLikeCode(query)) {
      const candidate: FuzzyScanCandidate = {
        item,
        score: nameScore.score * 0.7 + WEIGHTS.stock * stockSignal(item),
        reason: "Совпадение по названию",
      };
      if (!best || candidate.score > best.score) best = candidate;
    }

    if (best && best.score >= 0.35) ranked.push(best);
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}
