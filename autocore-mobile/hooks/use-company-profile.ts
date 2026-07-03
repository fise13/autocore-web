import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseDb, isFirebaseConfigured } from '@/services/firebase';
import { readCompanyDisplayName } from '@/lib/company-display-name';
import { normalizeCompanyId } from '@/lib/company-id';

export function useCompanyProfile(companyId: string | null | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(companyId));

  useEffect(() => {
    if (!companyId || !isFirebaseConfigured()) {
      setName(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const ref = doc(getFirebaseDb(), 'companies', companyId);
    return onSnapshot(
      ref,
      (snap) => {
        const id = normalizeCompanyId(companyId);
        setName(snap.exists() ? readCompanyDisplayName(snap.data(), id) : null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [companyId]);

  return { name, isLoading };
}
