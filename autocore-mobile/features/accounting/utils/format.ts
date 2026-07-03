export function formatKzt(value: number, compact = false): string {
  const rounded = Math.round(value);
  if (compact && rounded >= 1_000_000) {
    return `${(rounded / 1_000_000).toFixed(1).replace('.0', '')} млн ₸`;
  }
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₸`;
}

export function formatSignedKzt(value: number, direction: 'in' | 'out'): string {
  const prefix = direction === 'in' ? '+' : '−';
  return `${prefix}${formatKzt(Math.abs(value))}`;
}

export function formatPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}
