import { getJson, setJson } from '@/lib/storage/kv';
import { toast } from '@/components/ui/toast-store';
import { isNetworkError } from '@/lib/offline/network-error';

const STORAGE_KEY = 'autocore-mobile:mutation-outbox:v1';
const MAX_ITEMS = 200;

export type QueuedMutation = {
  id: string;
  path: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body: string | undefined;
  createdAt: string;
  attemptCount: number;
};

type PersistedOutbox = {
  items: QueuedMutation[];
};

let items: QueuedMutation[] = getJson<PersistedOutbox>(STORAGE_KEY)?.items ?? [];
const listeners = new Set<() => void>();

function persist(): void {
  setJson(STORAGE_KEY, { items } satisfies PersistedOutbox);
}

function publish(): void {
  persist();
  for (const listener of listeners) listener();
}

export function getMutationOutboxSnapshot(): { items: QueuedMutation[]; pendingCount: number } {
  return { items, pendingCount: items.length };
}

export function subscribeMutationOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function enqueueMutation(input: {
  path: string;
  method: string;
  body?: string;
}): QueuedMutation {
  const method = input.method.toUpperCase();
  const item: QueuedMutation = {
    id: `mut_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    path: input.path,
    method: method === 'PATCH' || method === 'PUT' || method === 'DELETE' ? method : 'POST',
    body: input.body,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
  };
  items = [item, ...items].slice(0, MAX_ITEMS);
  publish();
  toast({
    title: 'Saved on this iPhone',
    description: 'Saved on this phone. It sends by itself once you are back online.',
    variant: 'default',
  });
  return item;
}

export function shouldQueueMutation(error: unknown, method: string | undefined): boolean {
  const verb = (method ?? 'GET').toUpperCase();
  if (verb === 'GET' || verb === 'HEAD') return false;
  return isNetworkError(error);
}

export function markMutationAttempt(id: string): void {
  items = items.map((candidate) =>
    candidate.id === id ? { ...candidate, attemptCount: candidate.attemptCount + 1 } : candidate,
  );
  publish();
}

export function removeMutation(id: string): void {
  items = items.filter((candidate) => candidate.id !== id);
  publish();
}
