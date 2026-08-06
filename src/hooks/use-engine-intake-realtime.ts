"use client";

import { useMemo } from "react";
import type {
  EngineIntakeJob,
  EngineIntakeSession,
  IntakeAiInspectionResult,
  IntakeEvent,
  IntakePhoto,
} from "@autocore/engine-intake";

import {
  createEngineIntakeRepository,
  type EngineIntakeRepository,
} from "@/infrastructure/firestore/engine-intake-repository";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";

const repository = createEngineIntakeRepository();

export function useEngineIntakeJobsRealtime(companyId: string, enabled = true) {
  const active = Boolean(companyId && enabled);
  const queryKey = useMemo(() => ["engine-intake-jobs", companyId] as const, [companyId]);
  const query = useRealtimeQuery<EngineIntakeJob[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) => repository.subscribeJobs(companyId, onData, onError),
  });
  return {
    jobs: active ? query.data : [],
    loading: active ? query.isBootstrapping : false,
    error: active ? query.errorMessage : null,
  };
}

function useJobCollection<T>(
  companyId: string,
  jobId: string | null,
  key: string,
  subscribe: (
    repository: EngineIntakeRepository,
    companyId: string,
    jobId: string,
    onData: (data: T[]) => void,
    onError: (error: Error) => void,
  ) => () => void,
) {
  const active = Boolean(companyId && jobId);
  const queryKey = useMemo(
    () => [key, companyId, jobId ?? ""] as const,
    [companyId, jobId, key],
  );
  return useRealtimeQuery<T[]>({
    queryKey,
    enabled: active,
    initialData: [],
    subscribe: (onData, onError) =>
      subscribe(repository, companyId, jobId!, onData, onError),
  });
}

export function useEngineIntakeJobRealtime(companyId: string, jobId: string | null) {
  const sessions = useJobCollection<EngineIntakeSession>(
    companyId,
    jobId,
    "engine-intake-sessions",
    (repo, scopedCompanyId, scopedJobId, onData, onError) =>
      repo.subscribeSessions(scopedCompanyId, scopedJobId, onData, onError),
  );
  const photos = useJobCollection<IntakePhoto>(
    companyId,
    jobId,
    "engine-intake-photos",
    (repo, scopedCompanyId, scopedJobId, onData, onError) =>
      repo.subscribePhotos(scopedCompanyId, scopedJobId, onData, onError),
  );
  const events = useJobCollection<IntakeEvent>(
    companyId,
    jobId,
    "engine-intake-events",
    (repo, scopedCompanyId, scopedJobId, onData, onError) =>
      repo.subscribeEvents(scopedCompanyId, scopedJobId, onData, onError),
  );
  const inspections = useJobCollection<IntakeAiInspectionResult>(
    companyId,
    jobId,
    "engine-intake-ai",
    (repo, scopedCompanyId, scopedJobId, onData, onError) =>
      repo.subscribeAiInspections(scopedCompanyId, scopedJobId, onData, onError),
  );

  return {
    sessions: sessions.data,
    photos: photos.data,
    events: events.data,
    inspections: inspections.data,
    loading:
      sessions.isBootstrapping ||
      photos.isBootstrapping ||
      events.isBootstrapping ||
      inspections.isBootstrapping,
    error:
      sessions.errorMessage ||
      photos.errorMessage ||
      events.errorMessage ||
      inspections.errorMessage,
  };
}
