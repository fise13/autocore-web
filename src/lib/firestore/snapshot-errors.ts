import { FirestoreError } from "firebase/firestore";

export function isIgnorableFirestoreError(error: FirestoreError): boolean {
  return error.code === "permission-denied" || error.code === "unauthenticated";
}

export function notifyFirestoreSnapshotError(
  error: FirestoreError,
  onError?: (error: FirestoreError) => void,
): void {
  if (isIgnorableFirestoreError(error)) return;
  onError?.(error);
}
