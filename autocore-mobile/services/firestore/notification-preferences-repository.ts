import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { mergeNotificationPreferences } from '@/lib/notifications/merge-preferences';
import type { NotificationPreferences } from '@/types/notifications';
import { getFirebaseDb } from '@/services/firebase';

const PREFERENCES_COLLECTION = 'notificationPreferences';
const PREFERENCES_DOC_ID = 'default';

function preferencesRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid, PREFERENCES_COLLECTION, PREFERENCES_DOC_ID);
}

export function subscribeNotificationPreferences(
  uid: string,
  onData: (preferences: NotificationPreferences) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    preferencesRef(uid),
    (snapshot) => {
      const partial = snapshot.exists()
        ? (snapshot.data() as Partial<NotificationPreferences>)
        : null;
      onData(mergeNotificationPreferences(partial));
    },
    (error) => onError?.(error),
  );
}

export async function saveNotificationPreferences(
  uid: string,
  preferences: NotificationPreferences,
): Promise<void> {
  await setDoc(
    preferencesRef(uid),
    {
      ...preferences,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
