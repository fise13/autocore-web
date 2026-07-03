import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import type { CompanyAppConfig } from '@/types/company-config';
import { normalizeCompanyId } from '@/lib/company-id';

import { getFirebaseDb } from './index';

function companyAppConfigRef(companyId: string) {
  return doc(getFirebaseDb(), 'companies', normalizeCompanyId(companyId), 'settings', 'app');
}

export async function loadCompanyAppConfig(companyId: string): Promise<CompanyAppConfig | null> {
  const snapshot = await getDoc(companyAppConfigRef(companyId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as CompanyAppConfig;
}

export function subscribeCompanyAppConfig(
  companyId: string,
  onData: (config: CompanyAppConfig | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    companyAppConfigRef(companyId),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as CompanyAppConfig) : null);
    },
    (error) => {
      onError?.(error);
    },
  );
}
