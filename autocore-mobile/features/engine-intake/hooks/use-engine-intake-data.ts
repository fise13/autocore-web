import { useEffect, useMemo, useState } from 'react';
import type {
  EngineIntakeJob,
  EngineIntakeSession,
  IntakeEvent,
  IntakePhoto,
  ReworkRequest,
} from '@autocore/engine-intake';

import { getJson, setJson } from '@/lib/storage/kv';
import {
  subscribeEngineIntakeJobs,
  subscribeEngineIntakePhotos,
  subscribeEngineIntakeSessions,
} from '@/services/firestore/engine-intake-repository';

import {
  applyIdentityOverrides,
  applyReadyJobOverrides,
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

function detailCacheKey(companyId: string, jobId: string): string {
  return `engine-intake:detail:${companyId}:${jobId}`;
}

type JobsState = {
  companyId: string | null;
  jobs: EngineIntakeJob[];
  loading: boolean;
  error: string | null;
};

type CachedJobDetail = {
  sessions: EngineIntakeSession[];
  photos: IntakePhoto[];
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

export type EngineIntakeDetailListen = {
  sessions?: boolean;
  photos?: boolean;
};

function readCachedDetail(companyId: string, jobId: string): CachedJobDetail {
  return (
    getJson<CachedJobDetail>(detailCacheKey(companyId, jobId)) ?? {
      sessions: [],
      photos: [],
    }
  );
}

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
  const jobs = useMemo(
    () =>
      applyReadyJobOverrides(
        applyIdentityOverrides(
          mergeIntakeJobs(
            serverJobs,
            overlay.jobs,
            overlay.cancelledJobIds,
            overlay.verifiedJobIds,
          ),
          overlay.identityByJobId,
        ),
        overlay.readyJobIds,
      ),
    [overlay, serverJobs],
  );
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
  listen: EngineIntakeDetailListen = {},
) {
  const listenSessions = listen.sessions !== false;
  const listenPhotos = listen.photos !== false;
  const scope = companyId && jobId ? `${companyId}:${jobId}` : null;
  const [state, setState] = useState<JobDetailState>(() => {
    if (!companyId || !jobId) return { scope, ...EMPTY_JOB_DETAIL };
    const cached = readCachedDetail(companyId, jobId);
    return {
      scope,
      ...EMPTY_JOB_DETAIL,
      sessions: cached.sessions,
      photos: cached.photos,
    };
  });

  useEffect(() => {
    if (!companyId || !jobId) return;
    const nextScope = `${companyId}:${jobId}`;
    const cached = readCachedDetail(companyId, jobId);
    setState({
      scope: nextScope,
      ...EMPTY_JOB_DETAIL,
      sessions: cached.sessions,
      photos: cached.photos,
    });

    const persist = (partial: Partial<CachedJobDetail>) => {
      const current = readCachedDetail(companyId, jobId);
      setJson(detailCacheKey(companyId, jobId), { ...current, ...partial });
    };

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

    const unsubscribeSessions = listenSessions
      ? subscribeEngineIntakeSessions(
          companyId,
          jobId,
          (sessions) => {
            pruneIntakeOverlay(companyId, [], { jobId, sessions });
            persist({ sessions });
            update((current) => ({ ...current, sessions, error: null }));
          },
          onError,
        )
      : () => undefined;
    const unsubscribePhotos = listenPhotos
      ? subscribeEngineIntakePhotos(
          companyId,
          jobId,
          (photos) => {
            persist({ photos });
            update((current) => ({ ...current, photos, error: null }));
          },
          onError,
        )
      : () => undefined;
    return () => {
      unsubscribeSessions();
      unsubscribePhotos();
    };
  }, [companyId, jobId, listenPhotos, listenSessions]);

  const overlay = useIntakeOverlay(companyId);
  const base = state.scope === scope ? state : { scope, ...EMPTY_JOB_DETAIL };
  const overlaySessions = jobId ? (overlay.sessions[jobId] ?? []) : [];
  return {
    ...base,
    sessions: mergeIntakeSessions(base.sessions, overlaySessions),
  };
}
