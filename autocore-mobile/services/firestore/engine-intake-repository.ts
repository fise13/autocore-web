import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type {
  EngineIntakeAssignment,
  EngineIntakeJob,
  EngineIntakeSession,
  IntakeEvent,
  IntakePhoto,
  ReworkRequest,
} from '@autocore/engine-intake';
import { normalizeEngineIntakeProgress } from '@autocore/engine-intake';

import { notifyFirestoreSnapshotError } from '@/lib/firestore/snapshot-errors';
import { getFirebaseDb } from '@/services/firebase';

function timestampIso(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') {
      const date = toDate.call(value);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }
  }
  if (value && typeof value === 'object' && 'seconds' in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1_000).toISOString();
  }
  return null;
}

function mapAssignment(value: unknown): EngineIntakeAssignment {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    assigneeUid: typeof data.assigneeUid === 'string' ? data.assigneeUid : null,
    assigneeName: typeof data.assigneeName === 'string' ? data.assigneeName : null,
    claimedByUid: typeof data.claimedByUid === 'string' ? data.claimedByUid : null,
    claimedByName: typeof data.claimedByName === 'string' ? data.claimedByName : null,
    activeSessionId: typeof data.activeSessionId === 'string' ? data.activeSessionId : null,
    claimDeviceId: typeof data.claimDeviceId === 'string' ? data.claimDeviceId : null,
    claimedAt: timestampIso(data.claimedAt),
    claimExpiresAt: timestampIso(data.claimExpiresAt),
    lastHeartbeatAt: timestampIso(data.lastHeartbeatAt),
  };
}

function mapJob(snapshot: QueryDocumentSnapshot<DocumentData>): EngineIntakeJob {
  const data = snapshot.data();
  const identityConfirmation =
    data.identityConfirmation && typeof data.identityConfirmation === 'object'
      ? {
          ...data.identityConfirmation,
          confirmedAt: timestampIso(data.identityConfirmation.confirmedAt),
        }
      : null;
  const identityMismatch =
    data.identityMismatch && typeof data.identityMismatch === 'object'
      ? {
          ...data.identityMismatch,
          reportedAt: timestampIso(data.identityMismatch.reportedAt),
        }
      : null;
  const verificationLock =
    data.verificationLock && typeof data.verificationLock === 'object'
      ? {
          ...data.verificationLock,
          lockedAt: timestampIso(data.verificationLock.lockedAt),
          expiresAt: timestampIso(data.verificationLock.expiresAt),
        }
      : null;
  return {
    ...data,
    id: snapshot.id,
    assignment: mapAssignment(data.assignment),
    progress: normalizeEngineIntakeProgress(data.progress, data.requirements),
    identityConfirmation,
    identityMismatch,
    verificationLock,
    dueAt: timestampIso(data.dueAt),
    createdAt: timestampIso(data.createdAt),
    updatedAt: timestampIso(data.updatedAt),
    fieldCompletedAt: timestampIso(data.fieldCompletedAt),
    verifiedAt: timestampIso(data.verifiedAt),
  } as EngineIntakeJob;
}

function mapSession(snapshot: QueryDocumentSnapshot<DocumentData>): EngineIntakeSession {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    startedAt: timestampIso(data.startedAt),
    updatedAt: timestampIso(data.updatedAt),
    pausedAt: timestampIso(data.pausedAt),
    completedAt: timestampIso(data.completedAt),
    cancelledAt: timestampIso(data.cancelledAt),
    lastHeartbeatAt: timestampIso(data.lastHeartbeatAt),
  } as EngineIntakeSession;
}

function mapPhoto(snapshot: QueryDocumentSnapshot<DocumentData>): IntakePhoto {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    capturedAt: timestampIso(data.capturedAt),
    uploadedAt: timestampIso(data.uploadedAt),
    createdAt: timestampIso(data.createdAt),
    updatedAt: timestampIso(data.updatedAt),
    deletedAt: timestampIso(data.deletedAt),
  } as unknown as IntakePhoto;
}

function mapEvent(snapshot: QueryDocumentSnapshot<DocumentData>): IntakeEvent {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    clientAt: timestampIso(data.clientAt),
    serverAt: timestampIso(data.serverAt),
  } as IntakeEvent;
}

function mapReworkRequest(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ReworkRequest {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    requestedAt: timestampIso(data.requestedAt),
    resolvedAt: timestampIso(data.resolvedAt),
  } as ReworkRequest;
}

export function subscribeEngineIntakeJobs(
  companyId: string,
  onData: (jobs: EngineIntakeJob[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const jobsQuery = query(
    collection(getFirebaseDb(), 'companies', companyId, 'engineIntakeJobs'),
    orderBy('updatedAt', 'desc'),
    limit(150),
  );
  return onSnapshot(
    jobsQuery,
    (snapshot) => onData(snapshot.docs.map(mapJob)),
    (error) => notifyFirestoreSnapshotError(error, onError),
  );
}

export function subscribeEngineIntakeSessions(
  companyId: string,
  jobId: string,
  onData: (sessions: EngineIntakeSession[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const sessionsQuery = query(
    collection(getFirebaseDb(), 'companies', companyId, 'engineIntakeJobs', jobId, 'sessions'),
    orderBy('startedAt', 'desc'),
    limit(30),
  );
  return onSnapshot(
    sessionsQuery,
    (snapshot) => onData(snapshot.docs.map(mapSession)),
    (error) => notifyFirestoreSnapshotError(error, onError),
  );
}

export function subscribeEngineIntakePhotos(
  companyId: string,
  jobId: string,
  onData: (photos: IntakePhoto[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const photosQuery = query(
    collection(getFirebaseDb(), 'companies', companyId, 'engineIntakeJobs', jobId, 'photos'),
    orderBy('capturedAt', 'asc'),
    limit(200),
  );
  return onSnapshot(
    photosQuery,
    (snapshot) => onData(snapshot.docs.map(mapPhoto)),
    (error) => notifyFirestoreSnapshotError(error, onError),
  );
}

export function subscribeEngineIntakeEvents(
  companyId: string,
  jobId: string,
  onData: (events: IntakeEvent[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const eventsQuery = query(
    collection(getFirebaseDb(), 'companies', companyId, 'engineIntakeJobs', jobId, 'events'),
    orderBy('serverAt', 'desc'),
    limit(100),
  );
  return onSnapshot(
    eventsQuery,
    (snapshot) => onData(snapshot.docs.map(mapEvent)),
    (error) => notifyFirestoreSnapshotError(error, onError),
  );
}

export function subscribeEngineIntakeReworkRequests(
  companyId: string,
  jobId: string,
  onData: (requests: ReworkRequest[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const requestsQuery = query(
    collection(
      getFirebaseDb(),
      'companies',
      companyId,
      'engineIntakeJobs',
      jobId,
      'reworkRequests',
    ),
    orderBy('requestedAt', 'desc'),
    limit(20),
  );
  return onSnapshot(
    requestsQuery,
    (snapshot) => onData(snapshot.docs.map(mapReworkRequest)),
    (error) => notifyFirestoreSnapshotError(error, onError),
  );
}

export function engineIntakeJobDocument(companyId: string, jobId: string) {
  return doc(getFirebaseDb(), 'companies', companyId, 'engineIntakeJobs', jobId);
}
