import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type {
  EngineIntakeAssignment,
  EngineIntakeJob,
  EngineIntakeSession,
  IntakeAiInspectionResult,
  IntakeEvent,
  IntakePhoto,
} from "@autocore/engine-intake";
import {
  normalizeDocumentationChecklist,
  normalizeEngineIntakeProgress,
} from "@autocore/engine-intake";

import { getFirestoreDb } from "@/infrastructure/firebase/client";

function timestampIso(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") {
      const date = toDate.call(value);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }
  }
  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1_000).toISOString();
  }
  return null;
}

function mapAssignment(value: unknown): EngineIntakeAssignment {
  const data = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    assigneeUid: typeof data.assigneeUid === "string" ? data.assigneeUid : null,
    assigneeName: typeof data.assigneeName === "string" ? data.assigneeName : null,
    claimedByUid: typeof data.claimedByUid === "string" ? data.claimedByUid : null,
    claimedByName: typeof data.claimedByName === "string" ? data.claimedByName : null,
    activeSessionId: typeof data.activeSessionId === "string" ? data.activeSessionId : null,
    claimDeviceId: typeof data.claimDeviceId === "string" ? data.claimDeviceId : null,
    claimedAt: timestampIso(data.claimedAt),
    claimExpiresAt: timestampIso(data.claimExpiresAt),
    lastHeartbeatAt: timestampIso(data.lastHeartbeatAt),
  };
}

function mapJob(snapshot: QueryDocumentSnapshot<DocumentData>): EngineIntakeJob {
  const data = snapshot.data();
  const confirmation = (data.identityConfirmation ?? null) as Record<string, unknown> | null;
  const mismatch = (data.identityMismatch ?? null) as Record<string, unknown> | null;
  const verificationLock = (data.verificationLock ?? null) as Record<string, unknown> | null;
  const identity = (data.expectedIdentity ?? {}) as Record<string, unknown>;
  return {
    ...data,
    id: snapshot.id,
    assignment: mapAssignment(data.assignment),
    progress: normalizeEngineIntakeProgress(data.progress, data.requirements),
    documentationChecklist: normalizeDocumentationChecklist(data.documentationChecklist, {
      serialConfirmed: typeof identity.serialCode === "string" && identity.serialCode.trim().length > 0,
    }),
    identityConfirmation: confirmation
      ? {
          ...confirmation,
          confirmedAt: timestampIso(confirmation.confirmedAt),
        }
      : null,
    identityMismatch: mismatch
      ? {
          ...mismatch,
          reportedAt: timestampIso(mismatch.reportedAt),
        }
      : null,
    verificationLock: verificationLock
      ? {
          ...verificationLock,
          lockedAt: timestampIso(verificationLock.lockedAt),
          expiresAt: timestampIso(verificationLock.expiresAt),
        }
      : null,
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

function mapInspection(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): IntakeAiInspectionResult {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: timestampIso(data.createdAt),
    completedAt: timestampIso(data.completedAt),
  } as IntakeAiInspectionResult;
}

export function createEngineIntakeRepository() {
  const db = getFirestoreDb();
  return {
    subscribeJobs(
      companyId: string,
      onData: (jobs: EngineIntakeJob[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      return onSnapshot(
        query(
          collection(db, "companies", companyId, "engineIntakeJobs"),
          orderBy("updatedAt", "desc"),
          limit(250),
        ),
        (snapshot) => onData(snapshot.docs.map(mapJob)),
        onError,
      );
    },
    subscribeSessions(
      companyId: string,
      jobId: string,
      onData: (sessions: EngineIntakeSession[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      return onSnapshot(
        query(
          collection(db, "companies", companyId, "engineIntakeJobs", jobId, "sessions"),
          orderBy("startedAt", "desc"),
          limit(50),
        ),
        (snapshot) => onData(snapshot.docs.map(mapSession)),
        onError,
      );
    },
    subscribePhotos(
      companyId: string,
      jobId: string,
      onData: (photos: IntakePhoto[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      return onSnapshot(
        query(
          collection(db, "companies", companyId, "engineIntakeJobs", jobId, "photos"),
          orderBy("capturedAt", "asc"),
          limit(250),
        ),
        (snapshot) => onData(snapshot.docs.map(mapPhoto)),
        onError,
      );
    },
    subscribeEvents(
      companyId: string,
      jobId: string,
      onData: (events: IntakeEvent[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      return onSnapshot(
        query(
          collection(db, "companies", companyId, "engineIntakeJobs", jobId, "events"),
          orderBy("serverAt", "desc"),
          limit(150),
        ),
        (snapshot) => onData(snapshot.docs.map(mapEvent)),
        onError,
      );
    },
    subscribeAiInspections(
      companyId: string,
      jobId: string,
      onData: (inspections: IntakeAiInspectionResult[]) => void,
      onError?: (error: FirestoreError) => void,
    ) {
      return onSnapshot(
        query(
          collection(
            db,
            "companies",
            companyId,
            "engineIntakeJobs",
            jobId,
            "aiInspections",
          ),
          orderBy("createdAt", "desc"),
          limit(250),
        ),
        (snapshot) => onData(snapshot.docs.map(mapInspection)),
        onError,
      );
    },
  };
}

export type EngineIntakeRepository = ReturnType<typeof createEngineIntakeRepository>;
