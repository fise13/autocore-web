"use client";

import { useEffect, useRef, useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { useToast } from "@/components/ui/toast-provider";
import { MotorImportJob } from "@/domain/motor-import";
import { createMotorImportRepository } from "@/infrastructure/firestore/motor-import-repository";
import { useAuth } from "@/components/providers/auth-provider";
import { useMotorImportJobsRealtime } from "@/hooks/use-motor-import-jobs-realtime";
import {
  retryMotorImportJob,
} from "@/lib/motors/motor-import-api.client";
import { userCopy } from "@/lib/user-copy";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import {
  isActiveMotorImportSession,
  isMotorImportJobDismissed,
} from "@/lib/motors/import/motor-import-session";

const motorImportRepository = createMotorImportRepository();

function isInFlight(job: MotorImportJob): boolean {
  return job.status === "queued" || job.status === "analyzing" || job.status === "applying";
}

function previewJobTimestamp(job: MotorImportJob): number {
  return (job.updatedAt ?? job.createdAt).getTime();
}

function isCurrentUserJob(
  job: MotorImportJob,
  userId: string | undefined,
  pendingJobId: string | null,
): boolean {
  if (!userId) return false;
  if (job.createdByUserId === userId) return true;
  return pendingJobId !== null && job.id === pendingJobId;
}

function selectPreviewJob(
  jobs: MotorImportJob[],
  userId: string | undefined,
  pendingJobId: string | null,
): MotorImportJob | null {
  const previews = jobs.filter(
    (job) =>
      job.status === "preview" &&
      isCurrentUserJob(job, userId, pendingJobId) &&
      !isMotorImportJobDismissed(job.id) &&
      isActiveMotorImportSession(job.id, pendingJobId),
  );
  if (previews.length === 0) return null;
  if (pendingJobId) {
    const pendingMatch = previews.find((job) => job.id === pendingJobId);
    if (pendingMatch) return pendingMatch;
  }
  return previews[0] ?? null;
}

function selectActiveJob(
  jobs: MotorImportJob[],
  userId: string | undefined,
  pendingJobId: string | null,
): MotorImportJob | null {
  const inFlight = jobs.filter(
    (job) =>
      isInFlight(job) &&
      job.status !== "cancelled" &&
      isCurrentUserJob(job, userId, pendingJobId) &&
      !isMotorImportJobDismissed(job.id) &&
      isActiveMotorImportSession(job.id, pendingJobId),
  );
  if (inFlight.length === 0) return null;
  if (pendingJobId) {
    const pendingMatch = inFlight.find((job) => job.id === pendingJobId);
    if (pendingMatch) return pendingMatch;
  }
  return inFlight[0] ?? null;
}

function canAutoApply(job: MotorImportJob): boolean {
  return Boolean(
    job.autoApply &&
      job.quickImport &&
      job.stats.validEngineRows > 0 &&
      job.stats.errors === 0 &&
      job.stats.specificSheets === 0,
  );
}

function reviewSnapshotFromJob(job: MotorImportJob) {
  return {
    jobId: job.id,
    fileName: job.sourceFileName,
    totalMotors: job.stats.totalEngineRows,
    validMotors: job.stats.validEngineRows,
    specificSheets: job.stats.specificSheets,
  };
}

function progressFromJob(job: MotorImportJob) {
  const fallbackPercent =
    job.status === "queued" ? 1 : job.status === "applying" ? 1 : 5;
  return {
    jobId: job.id,
    phase: job.progress?.phase ?? (job.status === "applying" ? "apply" : "analyze"),
    percent: job.progress?.percent ?? fallbackPercent,
    message: job.progress?.message ?? "Обработка…",
    fileName: job.sourceFileName,
  } as const;
}

type MotorImportJobSyncProps = {
  onPreviewReady?: (job: MotorImportJob) => void;
  onCompleted?: (job: MotorImportJob) => void;
};

export function MotorImportJobSync({ onPreviewReady, onCompleted }: MotorImportJobSyncProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    motorImportPendingJobId,
    setMotorImportProgress,
    setMotorImportPendingJobId,
    motorImportReviewPending,
    setMotorImportReview,
  } = useWorkspace();

  const companyId = normalizeCompanyId(profile?.companyId);
  const canEdit = can(profile, "inventory_edit");
  const { jobs, errorMessage: jobsErrorMessage } = useMotorImportJobsRealtime(
    motorImportRepository,
    companyId,
    Boolean(canEdit && companyId),
  );

  const handledPreviewRef = useRef<Set<string>>(new Set());
  const handledCompletedRef = useRef<Set<string>>(new Set());
  const inFlightSeenRef = useRef<Set<string>>(new Set());
  const autoApplyAttemptedRef = useRef<Set<string>>(new Set());
  const retriedRef = useRef<Set<string>>(new Set());
  const applyingRecoveryRef = useRef<Set<string>>(new Set());
  const jobsErrorNotifiedRef = useRef(false);
  const [previewRecheckTick, setPreviewRecheckTick] = useState(0);

  const activeJob = selectActiveJob(jobs, profile?.id, motorImportPendingJobId);
  const previewJob = selectPreviewJob(jobs, profile?.id, motorImportPendingJobId);

  useEffect(() => {
    if (!jobsErrorMessage || jobsErrorNotifiedRef.current) return;
    jobsErrorNotifiedRef.current = true;
    toast({
      title: "Не удалось отслеживать импорт",
      description: jobsErrorMessage,
      variant: "error",
      durationMs: 10000,
    });
  }, [jobsErrorMessage, toast]);

  useEffect(() => {
    if (!previewJob?.autoApply || motorImportReviewPending) return;
    const ageMs = Date.now() - previewJobTimestamp(previewJob);
    if (ageMs >= 2500) return;
    const timer = window.setTimeout(() => setPreviewRecheckTick((value) => value + 1), 2500 - ageMs + 50);
    return () => window.clearTimeout(timer);
  }, [motorImportReviewPending, previewJob, previewRecheckTick]);

  useEffect(() => {
    if (!activeJob || isMotorImportJobDismissed(activeJob.id)) return;
    if (activeJob.status === "cancelled" || activeJob.status === "failed") return;
    inFlightSeenRef.current.add(activeJob.id);
    setMotorImportProgress(progressFromJob(activeJob));
    setMotorImportReview(null);
  }, [activeJob, setMotorImportProgress, setMotorImportReview]);

  useEffect(() => {
    if (!activeJob || activeJob.status !== "applying") return;
    if (isMotorImportJobDismissed(activeJob.id)) return;
    const percent = activeJob.progress?.percent ?? 0;
    const updatedAt = activeJob.updatedAt?.getTime() ?? 0;
    const ageMs = Date.now() - updatedAt;
    if (percent > 5 || ageMs < 90_000) return;
    if (applyingRecoveryRef.current.has(activeJob.id)) return;
    applyingRecoveryRef.current.add(activeJob.id);
    void retryMotorImportJob(activeJob.id);
  }, [activeJob]);

  useEffect(() => {
    if (!previewJob || motorImportReviewPending) return;
    if (isMotorImportJobDismissed(previewJob.id)) return;
    if (previewJob.status === "cancelled") return;
    if (!isActiveMotorImportSession(previewJob.id, motorImportPendingJobId)) {
      if (!handledPreviewRef.current.has(previewJob.id)) {
        handledPreviewRef.current.add(previewJob.id);
      }
      return;
    }
    if (motorImportPendingJobId && previewJob.id !== motorImportPendingJobId) return;
    if (handledPreviewRef.current.has(previewJob.id)) return;

    if (canAutoApply(previewJob)) {
      const previewAgeMs = Date.now() - previewJobTimestamp(previewJob);
      const isStuckPreview = previewAgeMs > 2500;
      const isPendingSessionJob =
        motorImportPendingJobId !== null && previewJob.id === motorImportPendingJobId;

      if (!isStuckPreview) {
        setMotorImportProgress({
          jobId: previewJob.id,
          phase: "analyze",
          percent: 98,
          message: "Готовим загрузку в базу…",
          fileName: previewJob.sourceFileName,
        });
        setMotorImportReview(null);
        return;
      }

      if (!isPendingSessionJob) {
        if (!autoApplyAttemptedRef.current.has(previewJob.id)) {
          autoApplyAttemptedRef.current.add(previewJob.id);
          inFlightSeenRef.current.add(previewJob.id);
          void retryMotorImportJob(previewJob.id);
        }
        return;
      }

      if (autoApplyAttemptedRef.current.has(previewJob.id)) return;

      autoApplyAttemptedRef.current.add(previewJob.id);
      handledPreviewRef.current.add(previewJob.id);
      inFlightSeenRef.current.add(previewJob.id);
      setMotorImportReview(null);
      void retryMotorImportJob(previewJob.id);
      return;
    }

    handledPreviewRef.current.add(previewJob.id);
    setMotorImportProgress(null);
    setMotorImportReview(reviewSnapshotFromJob(previewJob));
    onPreviewReady?.(previewJob);
  }, [
    motorImportPendingJobId,
    motorImportReviewPending,
    onPreviewReady,
    previewJob,
    previewRecheckTick,
    setMotorImportProgress,
    setMotorImportReview,
    toast,
  ]);

  useEffect(() => {
    for (const completed of jobs) {
      if (
        completed.status !== "completed" &&
        completed.status !== "failed" &&
        completed.status !== "cancelled"
      ) {
        continue;
      }
      if (!isCurrentUserJob(completed, profile?.id, motorImportPendingJobId)) continue;
      if (handledCompletedRef.current.has(completed.id)) continue;

      handledCompletedRef.current.add(completed.id);

      const isCurrentSessionJob =
        inFlightSeenRef.current.has(completed.id) ||
        (motorImportPendingJobId !== null && completed.id === motorImportPendingJobId) ||
        isMotorImportJobDismissed(completed.id);
      if (!isCurrentSessionJob) continue;

      setMotorImportPendingJobId(null);
      setMotorImportProgress(null);
      setMotorImportReview(null);

      if (completed.status === "cancelled" || isMotorImportJobDismissed(completed.id)) {
        continue;
      }

      if (completed.status === "completed") {
        const summary = completed.appliedSummary;
        toast({
          title: userCopy.motors.magicImportDone,
          description: summary
            ? `${summary.imported} моторов загружено · обновлено ${summary.updated}`
            : "Импорт завершён",
          variant: "success",
          durationMs: 8000,
        });
        onCompleted?.(completed);
      } else {
        toast({
          title: "Ошибка импорта",
          description: completed.errorMessage ?? "Не удалось завершить импорт",
          variant: "error",
          durationMs: 10000,
        });
      }
    }
  }, [
    jobs,
    motorImportPendingJobId,
    onCompleted,
    profile?.id,
    setMotorImportPendingJobId,
    setMotorImportProgress,
    setMotorImportReview,
    toast,
  ]);

  useEffect(() => {
    if (!motorImportPendingJobId || isMotorImportJobDismissed(motorImportPendingJobId)) return;
    const stuck = jobs.find(
      (job) =>
        job.id === motorImportPendingJobId &&
        job.status !== "cancelled" &&
        (job.status === "queued" || job.status === "analyzing" || job.status === "preview") &&
        !retriedRef.current.has(job.id),
    );
    if (!stuck) return;
    retriedRef.current.add(stuck.id);
    void retryMotorImportJob(stuck.id);
  }, [jobs, motorImportPendingJobId]);

  return null;
}
