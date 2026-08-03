import { useCallback, useEffect, useState } from 'react';

import {
  saveAccountingLists,
  subscribeAccountingSettings,
  type AccountingSettings,
} from '@/services/firestore/user-preferences-service';

const EMPTY: AccountingSettings = {
  employees: [],
  specifics: [],
  isConfigured: false,
  displayCurrency: 'USD',
};

export function useAccountingPreferences(uid: string | null | undefined) {
  const [settings, setSettings] = useState<AccountingSettings>(EMPTY);
  const [isLoading, setIsLoading] = useState(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setSettings(EMPTY);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeAccountingSettings(
      uid,
      (next) => {
        setSettings(next);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    return unsubscribe;
  }, [uid]);

  const saveLists = useCallback(
    async (lists: { employees: string[]; specifics: string[] }) => {
      if (!uid) throw new Error('User is not authenticated');
      const next = await saveAccountingLists(uid, lists);
      setSettings(next);
      return next;
    },
    [uid],
  );

  return {
    employees: settings.employees,
    specifics: settings.specifics,
    isConfigured: settings.isConfigured,
    displayCurrency: settings.displayCurrency,
    isLoading,
    saveLists,
  };
}
