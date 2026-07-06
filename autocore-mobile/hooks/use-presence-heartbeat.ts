import { useEffect } from 'react';
import { AppState } from 'react-native';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { getFirebaseDb } from '@/services/firebase';

const HEARTBEAT_MS = 5 * 60 * 1000;

async function touchLastActive(companyId: string, uid: string): Promise<void> {
  if (!companyId || !uid) return;
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'companies', companyId, 'employees', uid), {
    lastActiveAt: serverTimestamp(),
  });
}

export function usePresenceHeartbeat(companyId: string | null, uid: string | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !companyId || !uid) return;

    const touch = () => {
      void touchLastActive(companyId, uid).catch(() => undefined);
    };

    touch();
    const interval = setInterval(touch, HEARTBEAT_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') touch();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [companyId, enabled, uid]);
}
