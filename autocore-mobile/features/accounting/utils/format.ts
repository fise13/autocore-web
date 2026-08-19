import { formatPrice, useMoneyFormatStore } from '@/store/money-format-store';

/** Formats a stored USD amount for accounting surfaces. */
export function formatKzt(value: number, compact = false): string {
  const { convertMoney, currencyPrefix, currencySuffix } = useMoneyFormatStore.getState();
  const converted = Math.round(convertMoney(Number.isFinite(value) ? value : 0));
  if (compact && Math.abs(converted) >= 1_000_000) {
    const millions = (converted / 1_000_000).toFixed(1).replace('.0', '');
    return `${currencyPrefix}${millions}M${currencySuffix}`;
  }
  return formatPrice(value);
}

export function formatSignedKzt(value: number, direction: 'in' | 'out'): string {
  const prefix = direction === 'in' ? '+' : '−';
  return `${prefix}${formatPrice(Math.abs(value))}`;
}

export function formatPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}
