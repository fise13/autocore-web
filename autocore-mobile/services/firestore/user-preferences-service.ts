import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { normalizeAppDisplayCurrency, type AppDisplayCurrency } from '@/lib/money/display-currency';
import { getFirebaseDb } from '@/services/firebase';

function userRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid);
}

export function subscribeUserDisplayCurrency(
  uid: string,
  onData: (currency: AppDisplayCurrency) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    (snapshot) => {
      const data = snapshot.data() as Record<string, unknown> | undefined;
      const accountingSettings =
        typeof data?.accountingSettings === 'object' && data.accountingSettings != null
          ? (data.accountingSettings as Record<string, unknown>)
          : null;
      onData(normalizeAppDisplayCurrency(accountingSettings?.displayCurrency));
    },
    (error) => onError?.(error),
  );
}

export async function saveUserDisplayCurrency(uid: string, displayCurrency: AppDisplayCurrency): Promise<void> {
  await setDoc(
    userRef(uid),
    {
      accountingSettings: {
        displayCurrency: normalizeAppDisplayCurrency(displayCurrency),
      },
    },
    { merge: true },
  );
}
