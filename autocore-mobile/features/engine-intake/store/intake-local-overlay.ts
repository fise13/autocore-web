import { useSyncExternalStore } from 'react';
import type { EngineIntakeJob, EngineIntakeSession } from '@autocore/engine-intake';

import { getJson, setJson } from '@/lib/storage/kv';

import {
  applyOptimisticClaim,
  buildOptimisticIntakeJob,
  buildOptimisticIntakeSession,
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
  });
  return { job, session };
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
  const serverJobIds = new Set(serverJobs.map((job) => job.id));
  const jobs = current.jobs.filter((job) => !serverJobIds.has(job.id));
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

  if (
    jobs.length === current.jobs.length &&
    Object.keys(sessions).length === Object.keys(current.sessions).length &&
    cancelledJobIds.length === current.cancelledJobIds.length &&
    readyJobIds.length === current.readyJobIds.length &&
    verifiedJobIds.length === current.verifiedJobIds.length
  ) {
    return;
  }
  writeOverlay(companyId, { jobs, sessions, cancelledJobIds, readyJobIds, verifiedJobIds });
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
