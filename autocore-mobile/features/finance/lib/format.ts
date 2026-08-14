import { appDisplayCurrencyAffix, appDisplayCurrencyOption } from '@/lib/money/display-currency';

const AFFIX = appDisplayCurrencyAffix();
const OPTION = appDisplayCurrencyOption('USD');

/**
 * Whole units, everywhere on this surface.
 *
 * The shared money formatter prints cents below $1,000, which puts "−$562.00"
 * next to "+$5,358" in the same column. At this altitude the cent is never the
 * decision, and a stable glyph width is worth more than the precision — the
 * ledger keeps its own exact formatting for reconciliation.
 */
const WHOLE = new Intl.NumberFormat(OPTION.locale, {
  style: 'currency',
  currency: OPTION.currency,
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatMoneyExact(value: number): string {
  return WHOLE.format(Number.isFinite(value) ? value : 0);
}

function compactParts(abs: number): { value: number; unit: string } {
  if (abs >= 1_000_000_000) return { value: abs / 1_000_000_000, unit: 'B' };
  if (abs >= 1_000_000) return { value: abs / 1_000_000, unit: 'M' };
  if (abs >= 1_000) return { value: abs / 1_000, unit: 'K' };
  return { value: abs, unit: '' };
}

function trimZero(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

/**
 * Headline money — `$2.84M`, `$8.4K`, `$842`. Precision drops as the magnitude
 * rises so the glyph count stays stable across periods and the number does not
 * reflow while the user scrubs.
 */
export function formatMoneyCompact(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? '−' : '';

  if (abs < 1_000) {
    return `${sign}${AFFIX.prefix}${Math.round(abs).toLocaleString('en-US')}${AFFIX.suffix}`;
  }

  const { value: scaled, unit } = compactParts(abs);
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${sign}${AFFIX.prefix}${trimZero(scaled.toFixed(decimals))}${unit}${AFFIX.suffix}`;
}

/** Compact under six figures collapses detail that still matters — keep it exact. */
export function formatMoneyAdaptive(value: number): string {
  return Math.abs(value) >= 100_000 ? formatMoneyCompact(value) : formatMoneyExact(value);
}

export function formatSignedMoney(value: number, direction?: 'in' | 'out'): string {
  const outgoing = direction ? direction === 'out' : value < 0;
  const magnitude = formatMoneyAdaptive(Math.abs(value));
  return `${outgoing ? '−' : '+'}${magnitude}`;
}

/** `0.238` → `23.8%`. */
export function formatPercent(ratio: number | null, decimals = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${trimZero((ratio * 100).toFixed(decimals))}%`;
}

/** `0.184` → `+18.4%`; negatives use a true minus sign, not a hyphen. */
export function formatSignedPercent(ratio: number | null, decimals = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  const pct = ratio * 100;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${trimZero(Math.abs(pct).toFixed(decimals))}%`;
}

export function formatSignedPoints(value: number | null, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${trimZero(Math.abs(value).toFixed(decimals))}`;
}

export function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`;
}
