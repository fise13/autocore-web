import { useSyncExternalStore } from 'react';
import type { EngineIntakeJob, EngineIntakeSession } from '@autocore/engine-intake';

import { getJson, setJson } from '@/lib/storage/kv';

import {
  applyOptimisticClaim,
  buildOptimisticIntakeJob,
  buildOptimisticIntakeSession,
  identityOverrideSettled,
  type OptimisticIntakeIdentity,
} from '../lib/optimistic-intake-job';

type OverlayState = {
  jobs: EngineIntakeJob[];
  sessions: Record<string, EngineIntakeSession[]>;
  cancelledJobIds: string[];
  /** Job ids Finish has accepted locally while Firestore may still show documenting. */
  readyJobIds: string[];
  /** Job ids just released to Motors Grid while Firestore still shows Ready. */
  verifiedJobIds: string[];
  /** Serial edits that Firestore has not echoed yet. */
  identityByJobId: Record<string, OptimisticIntakeIdentity>;
};

const listeners = new Set<() => void>();
const memory = new Map<string, OverlayState>();

function storageKey(companyId: string): string {
  return `engine-intake:local-overlay:${companyId}`;
}

const EMPTY_OVERLAY: OverlayState = {
  jobs: [],
  sessions: {},
  cancelledJobIds: [],
  readyJobIds: [],
  verifiedJobIds: [],
  identityByJobId: {},
};

function emptyOverlay(): OverlayState {
  return EMPTY_OVERLAY;
}

function normalizeOverlay(value: OverlayState | null | undefined): OverlayState {
  return {
    jobs: value?.jobs ?? [],
    sessions: value?.sessions ?? {},
    cancelledJobIds: value?.cancelledJobIds ?? [],
    readyJobIds: value?.readyJobIds ?? [],
    verifiedJobIds: value?.verifiedJobIds ?? [],
    identityByJobId: value?.identityByJobId ?? {},
  };
}

function readOverlay(companyId: string): OverlayState {
  const cached = memory.get(companyId);
  if (cached) return cached;
  const persisted = normalizeOverlay(getJson<OverlayState>(storageKey(companyId)));
  memory.set(companyId, persisted);
  return persisted;
}

function writeOverlay(companyId: string, next: OverlayState): void {
  memory.set(companyId, next);
  setJson(storageKey(companyId), next);
  for (const listener of listeners) listener();
}

function upsertJob(jobs: EngineIntakeJob[], job: EngineIntakeJob): EngineIntakeJob[] {
  const without = jobs.filter((item) => item.id !== job.id);
  return [job, ...without];
}

function upsertSession(
  sessions: EngineIntakeSession[],
  session: EngineIntakeSession,
): EngineIntakeSession[] {
  const without = sessions.filter((item) => item.id !== session.id);
  return [session, ...without];
}

export function seedOptimisticIntakeCreate(input: {
  companyId: string;
  jobId: string;
  sessionId: string;
  uid: string;
  displayName: string | null;
  deviceId: string;
  deviceName: string | null;
  identity: OptimisticIntakeIdentity;
}): { job: EngineIntakeJob; session: EngineIntakeSession } {
  const job = buildOptimisticIntakeJob(input);
  const session = buildOptimisticIntakeSession({
    ...input,
    engineId: job.engineId,
  });
  const current = readOverlay(input.companyId);
  writeOverlay(input.companyId, {
    jobs: upsertJob(current.jobs, job),
    sessions: {
      ...current.sessions,
      [job.id]: upsertSession(current.sessions[job.id] ?? [], session),
    },
    cancelledJobIds: current.cancelledJobIds.filter((id) => id !== job.id),
    readyJobIds: current.readyJobIds.filter((id) => id !== job.id),
    verifiedJobIds: current.verifiedJobIds.filter((id) => id !== job.id),
    identityByJobId: omitIdentity(current.identityByJobId, job.id),
  });
  return { job, session };
}

export function seedOptimisticIntakeClaim(input: {
  companyId: string;
  job: EngineIntakeJob;
  sessionId: string;
  uid: string;
  displayName: string | null;
  deviceId: string;
  deviceName: string | null;
}): { job: EngineIntakeJob; session: EngineIntakeSession } {
  const job = applyOptimisticClaim(input.job, input);
  const session = buildOptimisticIntakeSession({
    companyId: input.companyId,
    jobId: job.id,
    sessionId: input.sessionId,
    engineId: job.engineId,
    uid: input.uid,
    displayName: input.displayName,
    deviceId: input.deviceId,
    deviceName: input.deviceName,
  });
  const current = readOverlay(input.companyId);
  writeOverlay(input.companyId, {
    jobs: upsertJob(current.jobs, job),
    sessions: {
      ...current.sessions,
      [job.id]: upsertSession(current.sessions[job.id] ?? [], session),
    },
    cancelledJobIds: current.cancelledJobIds.filter((id) => id !== job.id),
    readyJobIds: current.readyJobIds.filter((id) => id !== job.id),
    verifiedJobIds: current.verifiedJobIds.filter((id) => id !== job.id),
    identityByJobId: omitIdentity(current.identityByJobId, job.id),
  });
  return { job, session };
}

function omitIdentity(
  patches: Record<string, OptimisticIntakeIdentity>,
  jobId: string,
): Record<string, OptimisticIntakeIdentity> {
  if (!(jobId in patches)) return patches;
  const { [jobId]: _dropped, ...rest } = patches;
  return rest;
}

export function patchOptimisticIntakeIdentity(
  companyId: string,
  jobId: string,
  identity: OptimisticIntakeIdentity,
): void {
  const current = readOverlay(companyId);
  writeOverlay(companyId, {
    ...current,
    jobs: current.jobs.map((job) =>
      job.id === jobId
        ? {
            ...job,
            expectedIdentity: {
              ...job.expectedIdentity,
              serialCode: identity.serialCode,
              brandName: identity.brandName,
              engineCode: identity.engineCode,
            },
            updatedAt: new Date().toISOString(),
          }
        : job,
    ),
    identityByJobId: { ...current.identityByJobId, [jobId]: identity },
  });
}

export function markIntakeJobCancelled(companyId: string, jobId: string): void {
  const current = readOverlay(companyId);
  const { [jobId]: _dropped, ...sessions } = current.sessions;
  writeOverlay(companyId, {
    jobs: current.jobs.filter((job) => job.id !== jobId),
    sessions,
    cancelledJobIds: current.cancelledJobIds.includes(jobId)
      ? current.cancelledJobIds
      : [...current.cancelledJobIds, jobId],
    readyJobIds: current.readyJobIds.filter((id) => id !== jobId),
    verifiedJobIds: current.verifiedJobIds.filter((id) => id !== jobId),
    identityByJobId: omitIdentity(current.identityByJobId, jobId),
  });
}

export function restoreIntakeJobCancelled(companyId: string, jobId: string): void {
  const current = readOverlay(companyId);
  writeOverlay(companyId, {
    ...current,
    cancelledJobIds: current.cancelledJobIds.filter((id) => id !== jobId),
  });
}

/** Hide a just-released engine from Ready until Firestore shows verified. */
export function markIntakeJobVerified(companyId: string, jobId: string): void {
  const current = readOverlay(companyId);
  writeOverlay(companyId, {
    jobs: current.jobs.filter((job) => job.id !== jobId),
    sessions: current.sessions,
    cancelledJobIds: current.cancelledJobIds.filter((id) => id !== jobId),
    readyJobIds: current.readyJobIds.filter((id) => id !== jobId),
    verifiedJobIds: current.verifiedJobIds.includes(jobId)
      ? current.verifiedJobIds
      : [...current.verifiedJobIds, jobId],
    identityByJobId: omitIdentity(current.identityByJobId, jobId),
  });
}

export function restoreIntakeJobVerified(companyId: string, jobId: string): void {
  const current = readOverlay(companyId);
  if (!current.verifiedJobIds.includes(jobId)) return;
  writeOverlay(companyId, {
    ...current,
    verifiedJobIds: current.verifiedJobIds.filter((id) => id !== jobId),
  });
}

/** Flip the bay to Ready immediately — do not wait for a live Firestore snapshot. */
export function markIntakeJobReady(companyId: string, jobId: string): void {
  const current = readOverlay(companyId);
  if (current.readyJobIds.includes(jobId)) return;
  writeOverlay(companyId, {
    ...current,
    cancelledJobIds: current.cancelledJobIds.filter((id) => id !== jobId),
    readyJobIds: [...current.readyJobIds, jobId],
  });
}

export function restoreIntakeJobReady(companyId: string, jobId: string): void {
  const current = readOverlay(companyId);
  if (!current.readyJobIds.includes(jobId)) return;
  writeOverlay(companyId, {
    ...current,
    readyJobIds: current.readyJobIds.filter((id) => id !== jobId),
  });
}

/** Undo a claim that never reached the server so the bay does not lie. */
export function dropOptimisticIntakeClaim(
  companyId: string,
  jobId: string,
  restoreReady = false,
): void {
  const current = readOverlay(companyId);
  const { [jobId]: _dropped, ...sessions } = current.sessions;
  const readyJobIds =
    restoreReady && !current.readyJobIds.includes(jobId)
      ? [...current.readyJobIds, jobId]
      : current.readyJobIds;
  writeOverlay(companyId, {
    jobs: current.jobs.filter((job) => job.id !== jobId),
    sessions,
    cancelledJobIds: current.cancelledJobIds,
    readyJobIds,
    verifiedJobIds: current.verifiedJobIds.filter((id) => id !== jobId),
    identityByJobId: omitIdentity(current.identityByJobId, jobId),
  });
}

const READY_SETTLED_STATES = new Set([
  'awaiting_verification',
  'quarantine',
  'verified',
  'closed',
  'rejected',
  'cancelled',
]);

const VERIFIED_SETTLED_STATES = new Set([
  'verified',
  'closed',
  'rejected',
  'cancelled',
]);

export function pruneIntakeOverlay(
  companyId: string,
  serverJobs: EngineIntakeJob[],
  serverSessions?: { jobId: string; sessions: EngineIntakeSession[] },
): void {
  const current = readOverlay(companyId);
  const jobs = current.jobs.filter((job) => {
    const server = serverJobs.find((item) => item.id === job.id);
    if (!server) return true;
    const localSession = job.assignment.activeSessionId;
    // Keep the optimistic claim until Firestore names this session — pruning
    // on job id alone made Continue look like a released claim.
    if (localSession && server.assignment.activeSessionId !== localSession) {
      return true;
    }
    return false;
  });
  const sessions = { ...current.sessions };

  if (serverSessions) {
    const serverSessionIds = new Set(serverSessions.sessions.map((session) => session.id));
    const remaining = (sessions[serverSessions.jobId] ?? []).filter(
      (session) => !serverSessionIds.has(session.id),
    );
    if (remaining.length === 0) {
      delete sessions[serverSessions.jobId];
    } else {
      sessions[serverSessions.jobId] = remaining;
    }
  }

  const cancelledJobIds = current.cancelledJobIds.filter((jobId) => {
    const server = serverJobs.find((job) => job.id === jobId);
    if (!server) return true;
    return server.state !== 'cancelled' && server.state !== 'rejected';
  });

  // Session-only prunes pass `[]` — keep Finish overrides until a jobs snapshot.
  const readyJobIds =
    serverJobs.length === 0
      ? current.readyJobIds
      : current.readyJobIds.filter((jobId) => {
          const server = serverJobs.find((job) => job.id === jobId);
          if (!server) return true;
          // The server has recorded a Finish for this engine, so it knows more
          // about where the job stands than this guess does — including the case
          // where it has since moved back out of review. Holding the override
          // past that point is what let the phone offer a review of a job the
          // server was no longer holding for review, and answer the tap with
          // "Job is not ready for verification".
          if (server.fieldCompletedAt) return false;
          return !READY_SETTLED_STATES.has(server.state);
        });

  const verifiedJobIds =
    serverJobs.length === 0
      ? current.verifiedJobIds
      : current.verifiedJobIds.filter((jobId) => {
          const server = serverJobs.find((job) => job.id === jobId);
          if (!server) return true;
          return !VERIFIED_SETTLED_STATES.has(server.state);
        });

  const identityByJobId =
    serverJobs.length === 0
      ? current.identityByJobId
      : Object.fromEntries(
          Object.entries(current.identityByJobId).filter(([jobId, patch]) => {
            const server = serverJobs.find((job) => job.id === jobId);
            if (!server) return true;
            return !identityOverrideSettled(server, patch);
          }),
        );

  if (
    jobs.length === current.jobs.length &&
    Object.keys(sessions).length === Object.keys(current.sessions).length &&
    cancelledJobIds.length === current.cancelledJobIds.length &&
    readyJobIds.length === current.readyJobIds.length &&
    verifiedJobIds.length === current.verifiedJobIds.length &&
    Object.keys(identityByJobId).length === Object.keys(current.identityByJobId).length
  ) {
    return;
  }
  writeOverlay(companyId, {
    jobs,
    sessions,
    cancelledJobIds,
    readyJobIds,
    verifiedJobIds,
    identityByJobId,
  });
}

export function getIntakeOverlay(companyId: string | null): OverlayState {
  if (!companyId) return emptyOverlay();
  return readOverlay(companyId);
}

export function subscribeIntakeOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIntakeOverlay(companyId: string | null): OverlayState {
  return useSyncExternalStore(
    subscribeIntakeOverlay,
    () => getIntakeOverlay(companyId),
    () => getIntakeOverlay(companyId),
  );
}
