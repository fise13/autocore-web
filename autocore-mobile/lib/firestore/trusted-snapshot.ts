import {
  onSnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import {
  isUntrustedEmptyQuerySnapshot,
  isUntrustedMissingDocumentSnapshot,
} from '@/lib/firestore/untrusted-snapshot';

export {
  isUntrustedEmptyQuerySnapshot,
  isUntrustedMissingDocumentSnapshot,
} from '@/lib/firestore/untrusted-snapshot';

export function listenQuery(
  queryRef: Query,
  onData: (snapshot: QuerySnapshot) => void,
  onError?: (error: Error) => void,
  onUntrustedEmpty?: () => void,
): Unsubscribe {
  return onSnapshot(
    queryRef,
    (snapshot) => {
      if (isUntrustedEmptyQuerySnapshot(snapshot)) {
        onUntrustedEmpty?.();
        return;
      }
      onData(snapshot);
    },
    (error) => notifyFirestoreSnapshotError(error, onError),
  );
}

export function listenDocument(
  docRef: DocumentReference,
  onData: (snapshot: DocumentSnapshot) => void,
  onError?: (error: Error) => void,
  onUntrustedMissing?: () => void,
): Unsubscribe {
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (isUntrustedMissingDocumentSnapshot(snapshot)) {
        onUntrustedMissing?.();
        return;
      }
      onData(snapshot);
    },
    (error) => notifyFirestoreSnapshotError(error, onError),
  );
}
