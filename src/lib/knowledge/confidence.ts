/** Below this many observations a pattern is too thin to trust — score is forced to 0. */
export const MIN_SUPPORT = 3;

/** Confidence half-life: a pattern's recency boost halves every 90 days without new observations. */
const RECENCY_HALF_LIFE_DAYS = 90;
/** Recency never drags score below 60% of its raw Wilson bound — old-but-solid patterns still surface. */
const RECENCY_FLOOR = 0.6;

/**
 * Wilson score interval lower bound for a binomial proportion.
 *
 * Prefer this over a raw `successes / total` ratio: with few observations a
 * single lucky hit would otherwise look as trustworthy as a pattern proven
 * hundreds of times. The lower bound conservatively shrinks toward 0 until
 * enough evidence has accumulated.
 */
export function wilsonLowerBound(successes: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const n = total;
  const phat = Math.min(1, Math.max(0, successes / n));
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = phat + z2 / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n));
  return Math.max(0, Math.min(1, (center - margin) / denominator));
}

export type ScorePatternInput = {
  support: number;
  total: number;
  /** Days since the pattern was last reinforced by a new observation. */
  ageDays?: number;
};

/**
 * Final confidence score used to rank suggestions: Wilson lower bound,
 * gated by `MIN_SUPPORT` and decayed (but not erased) by staleness.
 */
export function scorePattern({ support, total, ageDays = 0 }: ScorePatternInput): number {
  if (total < MIN_SUPPORT || support <= 0) return 0;

  const base = wilsonLowerBound(support, total);
  const decay = Math.pow(0.5, Math.max(0, ageDays) / RECENCY_HALF_LIFE_DAYS);
  const recencyFactor = RECENCY_FLOOR + (1 - RECENCY_FLOOR) * decay;

  return Math.max(0, Math.min(1, base * recencyFactor));
}
