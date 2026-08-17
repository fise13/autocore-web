import { FirebaseError } from 'firebase/app';

export function notifyFirestoreSnapshotError(error: unknown, onError?: (error: Error) => void): void {
  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Firestore snapshot error');

  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      console.warn('[firestore]', error.code, error.message);
      onError?.(normalized);
      return;
    }
  }

  if (normalized.message.includes('INTERNAL ASSERTION FAILED')) {
    console.warn('[firestore]', normalized.message);
    return;
  }

  console.error('[firestore]', normalized);
  onError?.(normalized);
}
