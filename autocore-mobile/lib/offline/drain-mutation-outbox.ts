import {
  getMutationOutboxSnapshot,
  markMutationAttempt,
  removeMutation,
} from '@/lib/offline/mutation-outbox';
import { isNetworkError } from '@/lib/offline/network-error';
import { MobileApiError, mobileFetch } from '@/services/api/mobile-client';

let draining = false;

export async function drainMutationOutboxNow(): Promise<void> {
  if (draining) return;
  const snapshot = getMutationOutboxSnapshot();
  if (snapshot.items.length === 0) return;
  draining = true;
  try {
    const queue = [...snapshot.items].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
    for (const item of queue) {
      markMutationAttempt(item.id);
      try {
        await mobileFetch(item.path, {
          method: item.method,
          body: item.body,
          queueWhenOffline: false,
        });
        removeMutation(item.id);
      } catch (error) {
        if (isNetworkError(error)) return;
        if (error instanceof MobileApiError && error.status >= 500) return;
        removeMutation(item.id);
      }
    }
  } finally {
    draining = false;
  }
}

export { drainMutationOutboxNow as drainMutationOutbox };
