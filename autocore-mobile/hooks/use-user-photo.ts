import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/authentication/auth-provider';
import { sanitizeUserPhotoUrl } from '@/lib/user-photo';
import { getFirebaseDb, isFirebaseConfigured } from '@/services/firebase';

/**
 * Same resolution as web: Firestore users/{uid}.photoURL (live) → profile → Auth photoURL.
 */
export function useUserPhotoUrl(): string | null {
  const { firebaseUser, profile } = useAuth();
  const [firestorePhoto, setFirestorePhoto] = useState<string | null>(null);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid || !isFirebaseConfigured()) {
      setFirestorePhoto(null);
      return;
    }

    const ref = doc(getFirebaseDb(), 'users', uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const photoURL = snap.exists() ? String(snap.data()?.photoURL ?? '').trim() : '';
        setFirestorePhoto(sanitizeUserPhotoUrl(photoURL));
      },
      (error) => {
        console.warn('User photo listener failed:', error);
        setFirestorePhoto(null);
      },
    );

    return unsubscribe;
  }, [firebaseUser?.uid]);

  const profilePhoto = sanitizeUserPhotoUrl(profile?.photoURL);
  const authPhoto = sanitizeUserPhotoUrl(firebaseUser?.photoURL);

  return firestorePhoto || profilePhoto || authPhoto;
}
