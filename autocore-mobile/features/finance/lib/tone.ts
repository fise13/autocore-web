import type { SemanticColors } from '@/theme';

export type FinTone = 'positive' | 'negative' | 'neutral';

/**
 * Colour carries one meaning on this screen: direction of money. Green is
 * profit moving the right way, red is the wrong way, and everything structural
 * stays neutral — no palette is spent on decoration.
 */
export function toneForValue(value: number | null | undefined, higherIsBetter = true): FinTone {
  if (value == null || !Number.isFinite(value) || value === 0) return 'neutral';
  const good = higherIsBetter ? value > 0 : value < 0;
  return good ? 'positive' : 'negative';
}

export function toneColor(tone: FinTone, colors: SemanticColors): string {
  if (tone === 'positive') return colors.success;
  if (tone === 'negative') return colors.danger;
  return colors.mutedForeground;
}

export function toneSurface(tone: FinTone, colors: SemanticColors): string {
  if (tone === 'positive') return colors.successSubtle;
  if (tone === 'negative') return colors.dangerSubtle;
  return colors.secondary;
}

export function toneOnSurface(tone: FinTone, colors: SemanticColors): string {
  if (tone === 'positive') return colors.successOnSubtle;
  if (tone === 'negative') return colors.dangerOnSubtle;
  return colors.mutedForeground;
}

/** Health bands map onto the same three tones — never a fifth hue. */
export function bandTone(score: number | null): FinTone {
  if (score == null) return 'neutral';
  if (score >= 70) return 'positive';
  if (score < 45) return 'negative';
  return 'neutral';
}

export type FinDeltaDirection = 'up' | 'down' | 'flat' | 'none';

/**
 * Which way a number moved. Kept separate from tone: costs falling is a down
 * arrow in green, and merging the two would print "↑ −11.7%".
 */
export function deltaDirection(value: number | null | undefined): FinDeltaDirection {
  if (value == null || !Number.isFinite(value)) return 'none';
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}
