import { useEffect, useState } from 'react';
import type {
  EngineIntakeJob,
  EngineIntakeSession,
  IntakeEvent,
  IntakePhoto,
  ReworkRequest,
} from '@autocore/engine-intake';

import { getJson, setJson } from '@/lib/storage/kv';
import {
  subscribeEngineIntakeEvents,
  subscribeEngineIntakeJobs,
  subscribeEngineIntakePhotos,
  subscribeEngineIntakeReworkRequests,
  subscribeEngineIntakeSessions,
} from '@/services/firestore/engine-intake-repository';

import {
  mergeIntakeJobs,
  mergeIntakeSessions,
} from '../lib/optimistic-intake-job';
import {
  pruneIntakeOverlay,
  useIntakeOverlay,
} from '../store/intake-local-overlay';

function jobsCacheKey(companyId: string): string {
  return `engine-intake:jobs:${companyId}`;
}

type JobsState = {
  companyId: string | null;
  jobs: EngineIntakeJob[];
  loading: boolean;
  error: string | null;
};

type JobDetailState = {
  scope: string | null;
  sessions: EngineIntakeSession[];
  photos: IntakePhoto[];
  events: IntakeEvent[];
  reworkRequests: ReworkRequest[];
  error: string | null;
};

const EMPTY_JOB_DETAIL: Omit<JobDetailState, 'scope'> = {
  sessions: [],
  photos: [],
  events: [],
  reworkRequests: [],
  error: null,
};

export function useEngineIntakeJobs(companyId: string | null) {
  const overlay = useIntakeOverlay(companyId);
  const [state, setState] = useState<JobsState>(() => {
    const jobs = companyId ? (getJson<EngineIntakeJob[]>(jobsCacheKey(companyId)) ?? []) : [];
    return {
      companyId,
      jobs,
      loading: Boolean(companyId && jobs.length === 0),
      error: null,
    };
  });

  useEffect(() => {
    if (!companyId) return;
    return subscribeEngineIntakeJobs(
      companyId,
      (next) => {
        pruneIntakeOverlay(companyId, next);
        setState({ companyId, jobs: next, loading: false, error: null });
        setJson(jobsCacheKey(companyId), next);
      },
      (snapshotError) => {
        setState((current) => ({
          companyId,
          jobs:
            current.companyId === companyId
              ? current.jobs
              : (getJson<EngineIntakeJob[]>(jobsCacheKey(companyId)) ?? []),
          loading: false,
          error: snapshotError.message,
        }));
      },
    );
  }, [companyId]);

  const serverJobs = state.companyId === companyId
    ? state.jobs
    : companyId
      ? (getJson<EngineIntakeJob[]>(jobsCacheKey(companyId)) ?? [])
      : [];
  const jobs = mergeIntakeJobs(serverJobs, overlay.jobs);
  return {
    companyId,
    jobs,
    loading: Boolean(companyId && jobs.length === 0 && state.loading),
    error: state.companyId === companyId ? state.error : null,
  };
}

export function useEngineIntakeJobDetail(
  companyId: string | null,
  jobId: string | null,
) {
  const scope = companyId && jobId ? `${companyId}:${jobId}` : null;
  const [state, setState] = useState<JobDetailState>({
    scope,
    ...EMPTY_JOB_DETAIL,
  });

  useEffect(() => {
    if (!companyId || !jobId) return;
    const nextScope = `${companyId}:${jobId}`;
    const update = (
      updater: (current: Omit<JobDetailState, 'scope'>) => Omit<JobDetailState, 'scope'>,
    ) => {
      setState((current) => ({
        scope: nextScope,
        ...updater(current.scope === nextScope ? current : EMPTY_JOB_DETAIL),
      }));
    };
    const onError = (snapshotError: Error) =>
      update((current) => ({ ...current, error: snapshotError.message }));
    const unsubscribeSessions = subscribeEngineIntakeSessions(
      companyId,
      jobId,
      (sessions) => {
        pruneIntakeOverlay(companyId, [], { jobId, sessions });
        update((current) => ({ ...current, sessions, error: null }));
      },
      onError,
    );
    const unsubscribePhotos = subscribeEngineIntakePhotos(
      companyId,
      jobId,
      (photos) => update((current) => ({ ...current, photos, error: null })),
      onError,
    );
    const unsubscribeEvents = subscribeEngineIntakeEvents(
      companyId,
      jobId,
      (events) => update((current) => ({ ...current, events, error: null })),
      onError,
    );
    const unsubscribeRework = subscribeEngineIntakeReworkRequests(
      companyId,
      jobId,
      (reworkRequests) =>
        update((current) => ({ ...current, reworkRequests, error: null })),
      onError,
    );
    return () => {
      unsubscribeSessions();
      unsubscribePhotos();
      unsubscribeEvents();
      unsubscribeRework();
    };
  }, [companyId, jobId]);

  const overlay = useIntakeOverlay(companyId);
  const base = state.scope === scope ? state : { scope, ...EMPTY_JOB_DETAIL };
  const overlaySessions = jobId ? (overlay.sessions[jobId] ?? []) : [];
  return {
    ...base,
    sessions: mergeIntakeSessions(base.sessions, overlaySessions),
  };
}
