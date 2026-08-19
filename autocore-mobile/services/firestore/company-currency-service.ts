import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { listenDocument } from '@/lib/firestore/trusted-snapshot';
import { normalizeCompanyId } from '@/lib/company-id';
import {
  normalizeAppDisplayCurrency,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
import { getFirebaseDb } from '@/services/firebase';

function companyAppConfigRef(companyId: string) {
  return doc(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), 'settings', 'app');
}

function readDisplayCurrency(data: Record<string, unknown> | undefined): AppDisplayCurrency {
  return normalizeAppDisplayCurrency(data?.displayCurrency);
}

export function subscribeCompanyDisplayCurrency(
  companyId: string,
  onData: (currency: AppDisplayCurrency) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!companyId.trim()) {
    onData('USD');
    return () => undefined;
  }

  return listenDocument(
    companyAppConfigRef(companyId),
    (snapshot) => {
      const data = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : undefined;
      onData(readDisplayCurrency(data));
    },
    onError,
  );
}

export async function saveCompanyDisplayCurrency(
  companyId: string,
  displayCurrency: AppDisplayCurrency,
  updatedByUserId: string,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!normalizedCompanyId) {
    throw new Error('Company is not selected');
  }
  await setDoc(
    companyAppConfigRef(normalizedCompanyId),
    {
      displayCurrency: normalizeAppDisplayCurrency(displayCurrency),
      updatedByUserId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
