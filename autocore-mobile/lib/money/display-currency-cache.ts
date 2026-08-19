import { getString, setString } from '@/lib/storage/kv';
import {
  normalizeAppDisplayCurrency,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';

const LAST_KEY = 'display-currency:last';

function companyKey(companyId: string): string {
  return `display-currency:${companyId.trim()}`;
}

/** Last currency this workspace (or this device) displayed. */
export function readCachedDisplayCurrency(companyId?: string | null): AppDisplayCurrency {
  if (companyId?.trim()) {
    const forCompany = getString(companyKey(companyId));
    if (forCompany) return normalizeAppDisplayCurrency(forCompany);
  }
  return normalizeAppDisplayCurrency(getString(LAST_KEY));
}

export function writeCachedDisplayCurrency(
  companyId: string | null | undefined,
  currency: AppDisplayCurrency,
): void {
  const value = normalizeAppDisplayCurrency(currency);
  setString(LAST_KEY, value);
  if (companyId?.trim()) {
    setString(companyKey(companyId), value);
  }
}
