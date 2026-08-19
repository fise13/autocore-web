import { useEffect } from 'react';

import { useAppDisplayCurrency } from '@/hooks/use-app-display-currency';
import { useSession } from '@/hooks/use-session';
import { writeCachedDisplayCurrency } from '@/lib/money/display-currency-cache';
import { useMoneyFormatStore } from '@/store/money-format-store';

/** Keeps global `formatPrice()` in sync with Firestore + exchange rates. */
export function MoneyFormatSync() {
  const { companyId } = useSession();
  const { currency, rates } = useAppDisplayCurrency();
  const setMoneyFormat = useMoneyFormatStore((state) => state.setMoneyFormat);

  useEffect(() => {
    setMoneyFormat({ currency, rates });
    writeCachedDisplayCurrency(companyId, currency);
  }, [companyId, currency, rates, setMoneyFormat]);

  return null;
}
