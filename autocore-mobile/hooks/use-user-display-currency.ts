import { useCallback, useEffect, useState } from 'react';

import type { AppDisplayCurrency } from '@/lib/money/display-currency';
import { normalizeAppDisplayCurrency } from '@/lib/money/display-currency';
import {
  saveUserDisplayCurrency,
  subscribeUserDisplayCurrency,
} from '@/services/firestore/user-preferences-service';

export function useUserDisplayCurrency(uid: string | null | undefined) {
  const [currency, setCurrency] = useState<AppDisplayCurrency>('KZT');
  const [isLoading, setIsLoading] = useState(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setCurrency('KZT');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeUserDisplayCurrency(
      uid,
      (next) => {
        setCurrency(normalizeAppDisplayCurrency(next));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    return unsubscribe;
  }, [uid]);

  const saveCurrency = useCallback(
    async (next: AppDisplayCurrency) => {
      if (!uid) throw new Error('Пользователь не авторизован');
      await saveUserDisplayCurrency(uid, next);
    },
    [uid],
  );

  return { currency, isLoading, saveCurrency };
}
