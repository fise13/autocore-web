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
};

const listeners = new Set<() => void>();
const memory = new Map<string, OverlayState>();

function storageKey(companyId: string): string {
  return `engine-intake:local-overlay:${companyId}`;
}

const EMPTY_OVERLAY: OverlayState = { jobs: [], sessions: {} };

function emptyOverlay(): OverlayState {
  return EMPTY_OVERLAY;
}

function readOverlay(companyId: string): OverlayState {
  const cached = memory.get(companyId);
  if (cached) return cached;
  const persisted = getJson<OverlayState>(storageKey(companyId)) ?? emptyOverlay();
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
  });
  return { job, session };
}

export function pruneIntakeOverlay(
  companyId: string,
  serverJobs: EngineIntakeJob[],
  serverSessions?: { jobId: string; sessions: EngineIntakeSession[] },
): void {
  const current = readOverlay(companyId);
  const serverJobIds = new Set(serverJobs.map((job) => job.id));
  let jobs = current.jobs.filter((job) => !serverJobIds.has(job.id));
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

  for (const jobId of Object.keys(sessions)) {
    if (serverJobIds.has(jobId) && !jobs.some((job) => job.id === jobId) && !serverSessions) {
      // Keep sessions for jobs the server already has — claim overlay may still
      // be ahead of the sessions listener.
      continue;
    }
  }

  if (jobs.length === current.jobs.length && Object.keys(sessions).length === Object.keys(current.sessions).length) {
    return;
  }
  writeOverlay(companyId, { jobs, sessions });
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
