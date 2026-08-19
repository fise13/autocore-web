import { formatPrice } from '@/store/money-format-store';

export function formatCurrency(value: number): string {
  return formatPrice(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
