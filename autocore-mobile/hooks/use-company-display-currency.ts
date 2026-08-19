import { useCallback, useEffect, useState } from 'react';

import type { AppDisplayCurrency } from '@/lib/money/display-currency';
import { normalizeAppDisplayCurrency } from '@/lib/money/display-currency';
import {
  readCachedDisplayCurrency,
  writeCachedDisplayCurrency,
} from '@/lib/money/display-currency-cache';
import {
  saveCompanyDisplayCurrency,
  subscribeCompanyDisplayCurrency,
} from '@/services/firestore/company-currency-service';
import { useAuthStore } from '@/store/auth-store';
import { useMoneyFormatStore } from '@/store/money-format-store';

function syncMoneyFormatStore(currency: AppDisplayCurrency) {
  const store = useMoneyFormatStore.getState();
  if (store.currency === currency) return;
  store.setMoneyFormat({ currency, rates: store.rates });
}

function seedCurrency(
  companyId: string | null | undefined,
  fromConfig: unknown,
): AppDisplayCurrency {
  if (fromConfig === 'KZT' || fromConfig === 'USD') {
    return fromConfig;
  }
  return readCachedDisplayCurrency(companyId);
}

export function useCompanyDisplayCurrency(companyId: string | null | undefined) {
  const companyConfig = useAuthStore((state) => state.companyConfig);
  const [currency, setCurrency] = useState<AppDisplayCurrency>(() =>
    seedCurrency(companyId, companyConfig?.displayCurrency),
  );
  const [isLoading, setIsLoading] = useState(Boolean(companyId?.trim()) && !companyConfig?.displayCurrency);

  useEffect(() => {
    const seeded = seedCurrency(companyId, companyConfig?.displayCurrency);
    setCurrency(seeded);
    writeCachedDisplayCurrency(companyId, seeded);
    syncMoneyFormatStore(seeded);

    if (!companyId?.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(!companyConfig?.displayCurrency);
    const unsubscribe = subscribeCompanyDisplayCurrency(
      companyId,
      (next) => {
        const resolved = normalizeAppDisplayCurrency(next);
        setCurrency(resolved);
        writeCachedDisplayCurrency(companyId, resolved);
        syncMoneyFormatStore(resolved);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    return unsubscribe;
  }, [companyId, companyConfig?.displayCurrency]);

  const saveCurrency = useCallback(
    async (next: AppDisplayCurrency, updatedByUserId: string) => {
      if (!companyId?.trim()) throw new Error('Company is not selected');
      if (!updatedByUserId) throw new Error('User is not authenticated');
      const resolved = normalizeAppDisplayCurrency(next);
      setCurrency(resolved);
      writeCachedDisplayCurrency(companyId, resolved);
      syncMoneyFormatStore(resolved);
      await saveCompanyDisplayCurrency(companyId, resolved, updatedByUserId);
    },
    [companyId],
  );

  return { currency, isLoading, saveCurrency };
}
