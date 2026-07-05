import { useEffect } from 'react';

import { useAppDisplayCurrency } from '@/hooks/use-app-display-currency';
import { useSession } from '@/hooks/use-session';
import { useMoneyFormatStore } from '@/store/money-format-store';

/** Keeps global `formatPrice()` in sync with Firestore + exchange rates. */
export function MoneyFormatSync() {
  const { uid } = useSession();
  const { currency, rates } = useAppDisplayCurrency();
  const setMoneyFormat = useMoneyFormatStore((state) => state.setMoneyFormat);

  useEffect(() => {
    if (!uid) return;
    setMoneyFormat({ currency, rates });
  }, [currency, rates, setMoneyFormat, uid]);

  return null;
}
