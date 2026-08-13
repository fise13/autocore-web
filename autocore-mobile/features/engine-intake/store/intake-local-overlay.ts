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
};

const listeners = new Set<() => void>();
const memory = new Map<string, OverlayState>();

function storageKey(companyId: string): string {
  return `engine-intake:local-overlay:${companyId}`;
}

const EMPTY_OVERLAY: OverlayState = { jobs: [], sessions: {}, cancelledJobIds: [] };

function emptyOverlay(): OverlayState {
  return EMPTY_OVERLAY;
}

function normalizeOverlay(value: OverlayState | null | undefined): OverlayState {
  return {
    jobs: value?.jobs ?? [],
    sessions: value?.sessions ?? {},
    cancelledJobIds: value?.cancelledJobIds ?? [],
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
  });
}

export function restoreIntakeJobCancelled(companyId: string, jobId: string): void {
  const current = readOverlay(companyId);
  writeOverlay(companyId, {
    ...current,
    cancelledJobIds: current.cancelledJobIds.filter((id) => id !== jobId),
  });
}

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

  if (
    jobs.length === current.jobs.length &&
    Object.keys(sessions).length === Object.keys(current.sessions).length &&
    cancelledJobIds.length === current.cancelledJobIds.length
  ) {
    return;
  }
  writeOverlay(companyId, { jobs, sessions, cancelledJobIds });
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
