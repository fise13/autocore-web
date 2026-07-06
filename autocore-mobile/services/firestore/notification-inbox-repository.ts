import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { getFirebaseDb } from '@/services/firebase';
import type { NotificationInboxState, NotificationRecord } from '@/types/notifications';

const COLLECTION = 'notifications';

function mapNotificationRecord(id: string, data: Record<string, unknown>): NotificationRecord {
  return {
    id,
    userId: String(data.userId ?? ''),
    companyId: String(data.companyId ?? ''),
    eventType: String(data.eventType ?? ''),
    category: (data.category as NotificationRecord['category']) ?? 'system',
    priority: (data.priority as NotificationRecord['priority']) ?? 'medium',
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    state: (data.state as NotificationInboxState) ?? 'unread',
    deepLink: typeof data.deepLink === 'string' ? data.deepLink : undefined,
    groupKey: typeof data.groupKey === 'string' ? data.groupKey : undefined,
    groupCount: typeof data.groupCount === 'number' ? data.groupCount : undefined,
    actorUserId: typeof data.actorUserId === 'string' ? data.actorUserId : undefined,
    actorName: typeof data.actorName === 'string' ? data.actorName : undefined,
    aggregateType: typeof data.aggregateType === 'string' ? data.aggregateType : undefined,
    aggregateId: typeof data.aggregateId === 'string' ? data.aggregateId : undefined,
    eventId: typeof data.eventId === 'string' ? data.eventId : undefined,
    channelsDelivered: Array.isArray(data.channelsDelivered)
      ? (data.channelsDelivered as NotificationRecord['channelsDelivered'])
      : ['inbox'],
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    readAt: typeof data.readAt === 'string' ? data.readAt : undefined,
    archivedAt: typeof data.archivedAt === 'string' ? data.archivedAt : undefined,
  };
}

function filterByState(
  items: NotificationRecord[],
  state: NotificationInboxState | 'active',
): NotificationRecord[] {
  if (!state || state === 'active') {
    return items.filter((item) => item.state === 'unread' || item.state === 'read');
  }
  return items.filter((item) => item.state === state);
}

function mapCompanyInbox(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
  companyId: string,
  state: NotificationInboxState | 'active',
  limit: number,
): { items: NotificationRecord[]; unreadCount: number } {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const companyItems = docs
    .map((docSnap) => mapNotificationRecord(docSnap.id, docSnap.data()))
    .filter((item) => normalizeCompanyId(item.companyId) === normalizedCompanyId);

  const unreadCount = companyItems.filter((item) => item.state === 'unread').length;
  const items = filterByState(companyItems, state)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);

  return { items, unreadCount };
}

export async function fetchInboxFromFirestore(params: {
  userId: string;
  companyId: string;
  state?: NotificationInboxState | 'active';
  limit?: number;
}): Promise<{ items: NotificationRecord[]; unreadCount: number }> {
  const limit = params.limit ?? 50;

  const snap = await getDocs(
    query(collection(getFirebaseDb(), COLLECTION), where('userId', '==', params.userId)),
  );

  return mapCompanyInbox(snap.docs, params.companyId, params.state ?? 'active', limit);
}

export function subscribeInboxFromFirestore(params: {
  userId: string;
  companyId: string;
  state?: NotificationInboxState | 'active';
  limit?: number;
  onData: (payload: { items: NotificationRecord[]; unreadCount: number }) => void;
  onError?: (error: Error) => void;
}): () => void {
  const limit = params.limit ?? 50;
  const inboxQuery = query(
    collection(getFirebaseDb(), COLLECTION),
    where('userId', '==', params.userId),
  );

  return onSnapshot(
    inboxQuery,
    (snapshot) => {
      params.onData(
        mapCompanyInbox(snapshot.docs, params.companyId, params.state ?? 'active', limit),
      );
    },
    (error) => params.onError?.(error),
  );
}

export async function updateInboxNotificationState(
  notificationId: string,
  state: NotificationInboxState,
): Promise<void> {
  const patch: Record<string, unknown> = { state };
  if (state === 'read') patch.readAt = new Date().toISOString();
  if (state === 'archived') patch.archivedAt = new Date().toISOString();

  await updateDoc(doc(getFirebaseDb(), COLLECTION, notificationId), patch);
}

export async function markAllInboxNotificationsRead(
  userId: string,
  companyId: string,
): Promise<number> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const snap = await getDocs(
    query(collection(getFirebaseDb(), COLLECTION), where('userId', '==', userId)),
  );

  const batch = writeBatch(getFirebaseDb());
  const now = new Date().toISOString();
  let updated = 0;

  for (const docSnap of snap.docs) {
    const item = mapNotificationRecord(docSnap.id, docSnap.data());
    if (normalizeCompanyId(item.companyId) !== normalizedCompanyId || item.state !== 'unread') {
      continue;
    }
    batch.update(docSnap.ref, { state: 'read', readAt: now });
    updated += 1;
  }

  if (updated > 0) {
    await batch.commit();
  }

  return updated;
}
