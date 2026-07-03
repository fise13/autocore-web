export function formatPrice(value: number, currency = '₸'): string {
  const grouped = Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped} ${currency}`;
}

export function formatVin(vin?: string): string | undefined {
  if (!vin) return undefined;
  if (vin.length <= 12) return vin;
  return `${vin.slice(0, 8)}…${vin.slice(-4)}`;
}
