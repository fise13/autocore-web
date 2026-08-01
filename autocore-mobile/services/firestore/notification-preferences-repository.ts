import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { stripUndefinedDeep } from '@/lib/firestore/strip-undefined';
import { mergeNotificationPreferences } from '@/lib/notifications/merge-preferences';
import { updateNotificationPreferences } from '@/services/api/notification-api';
import { MobileApiError } from '@/services/api/mobile-client';
import type { NotificationPreferences } from '@/types/notifications';
import { getFirebaseDb } from '@/services/firebase';

const PREFERENCES_COLLECTION = 'notificationPreferences';
const PREFERENCES_DOC_ID = 'default';

function preferencesRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid, PREFERENCES_COLLECTION, PREFERENCES_DOC_ID);
}

function buildPreferencesPayload(preferences: NotificationPreferences): NotificationPreferences {
  return stripUndefinedDeep({
    ...preferences,
    updatedAt: new Date().toISOString(),
  });
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
  const payload = buildPreferencesPayload(preferences);

  try {
    await updateNotificationPreferences(payload);
    return;
  } catch (apiError) {
    if (apiError instanceof MobileApiError && (apiError.status === 401 || apiError.status === 403)) {
      throw apiError;
    }
    if (__DEV__) {
      console.warn('[preferences] API save failed, falling back to Firestore', apiError);
    }
  }

  try {
    await setDoc(preferencesRef(uid), payload, { merge: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    throw new Error(message);
  }
}
