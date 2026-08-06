import type {
  EngineIntakeJob,
  EngineIntakeJobState,
  EngineIntakeProgress,
  EngineIntakeSessionState,
  IntakePhoto,
  PhotoRequirement,
} from "./types";

const JOB_TRANSITIONS: Record<EngineIntakeJobState, readonly EngineIntakeJobState[]> = {
  open: ["in_session", "paused", "cancelled"],
  in_session: ["open", "paused", "awaiting_verification", "cancelled"],
  paused: ["open", "in_session", "cancelled"],
  awaiting_verification: ["rework", "verified", "quarantine", "rejected", "cancelled"],
  rework: ["in_session", "awaiting_verification", "paused", "cancelled"],
  verified: ["closed"],
  quarantine: ["rework", "rejected", "cancelled"],
  rejected: [],
  closed: [],
  cancelled: [],
};

const SESSION_TRANSITIONS: Record<
  EngineIntakeSessionState,
  readonly EngineIntakeSessionState[]
> = {
  active: ["paused", "completed_local", "completed", "cancelled", "stale"],
  paused: ["active", "cancelled", "stale"],
  completed_local: ["completed"],
  completed: ["merged", "archived"],
  cancelled: ["archived"],
  stale: ["active", "cancelled", "merged", "archived"],
  merged: ["archived"],
  archived: [],
};

export function canTransitionEngineIntakeJob(
  from: EngineIntakeJobState,
  to: EngineIntakeJobState,
): boolean {
  return from === to || JOB_TRANSITIONS[from].includes(to);
}

export function canTransitionEngineIntakeSession(
  from: EngineIntakeSessionState,
  to: EngineIntakeSessionState,
): boolean {
  return from === to || SESSION_TRANSITIONS[from].includes(to);
}

export function assertEngineIntakeJobTransition(
  from: EngineIntakeJobState,
  to: EngineIntakeJobState,
): void {
  if (!canTransitionEngineIntakeJob(from, to)) {
    throw new Error(`Engine intake job cannot transition from ${from} to ${to}`);
  }
}

export function assertEngineIntakeSessionTransition(
  from: EngineIntakeSessionState,
  to: EngineIntakeSessionState,
): void {
  if (!canTransitionEngineIntakeSession(from, to)) {
    throw new Error(`Engine intake session cannot transition from ${from} to ${to}`);
  }
}

type ProgressPhoto = Pick<
  IntakePhoto,
  "id" | "deletedAt" | "syncState" | "url" | "reviewDecision" | "requirementId"
>;

function activePhotos(photos: readonly ProgressPhoto[]): ProgressPhoto[] {
  return photos.filter((photo) => photo.deletedAt == null);
}

export function deriveEngineIntakeProgress(
  requirements: readonly PhotoRequirement[],
  photos: readonly ProgressPhoto[],
): EngineIntakeProgress {
  const currentPhotos = activePhotos(photos);
  const uploaded = currentPhotos.filter((photo) => photo.syncState === "synced" && photo.url);
  const accepted = currentPhotos.filter((photo) => photo.reviewDecision === "accepted");
  const rejected = currentPhotos.filter(
    (photo) =>
      photo.reviewDecision === "rejected" || photo.reviewDecision === "retake_requested",
  );

  const satisfiedRequirementIds = new Set<string>();
  const requirementCounts: Record<string, number> = {};
  for (const requirement of requirements) {
    const count = currentPhotos.filter(
      (photo) =>
        photo.requirementId === requirement.id &&
        photo.reviewDecision !== "rejected" &&
        photo.reviewDecision !== "retake_requested",
    ).length;
    requirementCounts[requirement.id] = count;
    if (count >= requirement.minCount) {
      satisfiedRequirementIds.add(requirement.id);
    }
  }

  const required = requirements.filter((requirement) => requirement.required);
  return {
    requiredCount: required.length,
    satisfiedCount: required.filter((requirement) =>
      satisfiedRequirementIds.has(requirement.id),
    ).length,
    capturedCount: currentPhotos.length,
    uploadedCount: uploaded.length,
    acceptedCount: accepted.length,
    requirementCounts,
    missingRequirementIds: required
      .filter((requirement) => !satisfiedRequirementIds.has(requirement.id))
      .map((requirement) => requirement.id),
    rejectedPhotoIds: rejected.map((photo) => photo.id),
    syncQueueDepth: currentPhotos.filter(
      (photo) => photo.syncState !== "synced" && photo.syncState !== "failed",
    ).length,
  };
}

export function fieldRequirementsSatisfied(
  requirements: readonly PhotoRequirement[],
  progress: EngineIntakeProgress,
): boolean {
  const fieldRequirementIds = new Set(
    requirements
      .filter((requirement) => requirement.required && requirement.strictness === "field")
      .map((requirement) => requirement.id),
  );
  return !progress.missingRequirementIds.some((id) => fieldRequirementIds.has(id));
}

export function verificationRequirementsSatisfied(progress: EngineIntakeProgress): boolean {
  return progress.missingRequirementIds.length === 0 && progress.rejectedPhotoIds.length === 0;
}

export function isEngineIntakeSessionStale(
  lastHeartbeatAt: string | null,
  now = Date.now(),
  staleAfterMs = 2 * 60 * 1000,
): boolean {
  if (!lastHeartbeatAt) return true;
  const heartbeatMs = Date.parse(lastHeartbeatAt);
  return !Number.isFinite(heartbeatMs) || now - heartbeatMs > staleAfterMs;
}

export function canReleaseEngineForSale(
  job: Pick<EngineIntakeJob, "state" | "location" | "progress">,
): boolean {
  return (
    job.state === "awaiting_verification" &&
    job.location != null &&
    verificationRequirementsSatisfied(job.progress)
  );
}

export function engineIntakeCompletionPercent(
  progress: Pick<EngineIntakeProgress, "requiredCount" | "satisfiedCount">,
): number {
  if (progress.requiredCount <= 0) return 100;
  return Math.round(
    Math.min(1, Math.max(0, progress.satisfiedCount / progress.requiredCount)) * 100,
  );
}
