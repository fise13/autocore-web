import {
  canReleaseWithChecklist,
  checklistWhisper,
  reconcileDocumentationChecklist,
  seedDocumentationChecklist,
  type DocumentationChecklist,
} from "./checklist";
import {
  canFinishWarehouseCapture,
  deriveDocumentationCoverage,
  ENGINE_INTAKE_STAGING_LOCATION_CODE,
  ENGINE_INTAKE_STAGING_LOCATION_ID,
  SUGGESTED_READY_COVERAGE_PERCENT,
} from "./coverage";
import type {
  EngineIntakeJob,
  EngineIntakeJobState,
  EngineIntakeProgress,
  EngineIntakeSessionState,
  IntakePhoto,
  IntakePhotoCategory,
  PhotoRequirement,
} from "./types";

export {
  ENGINE_INTAKE_STAGING_LOCATION_CODE,
  ENGINE_INTAKE_STAGING_LOCATION_ID,
  SUGGESTED_READY_COVERAGE_PERCENT,
};

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
> & {
  category?: IntakePhotoCategory | null;
  checklistHits?: DocumentationChecklist["items"][number]["id"][];
  hitConfidence?: number;
};

function activePhotos(photos: readonly ProgressPhoto[]): ProgressPhoto[] {
  return photos.filter((photo) => photo.deletedAt == null);
}

export function deriveEngineIntakeProgress(
  requirements: readonly PhotoRequirement[],
  photos: readonly ProgressPhoto[],
  options: {
    serialConfirmed?: boolean;
    previousChecklist?: DocumentationChecklist | null;
    cylinderCount?: number | null;
    hasTurbo?: boolean | null;
    oilPanRemoved?: boolean | null;
  } = {},
): EngineIntakeProgress & { documentationChecklist: DocumentationChecklist } {
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
  const coverage = deriveDocumentationCoverage(
    currentPhotos.map((photo) => ({
      category: photo.category ?? "other",
      reviewDecision: photo.reviewDecision,
      deletedAt: photo.deletedAt,
    })),
    { serialConfirmed: options.serialConfirmed },
  );

  const documentationChecklist = reconcileDocumentationChecklist({
    previous:
      options.previousChecklist ??
      seedDocumentationChecklist({
        serialConfirmed: options.serialConfirmed,
      }),
    photos: currentPhotos.map((photo) => ({
      id: photo.id,
      category: photo.category ?? "other",
      reviewDecision: photo.reviewDecision,
      deletedAt: photo.deletedAt,
      checklistHits: photo.checklistHits,
      hitConfidence: photo.hitConfidence,
    })),
    hints: {
      serialConfirmed: options.serialConfirmed,
      cylinderCount: options.cylinderCount,
      hasTurbo: options.hasTurbo,
      oilPanRemoved: options.oilPanRemoved,
    },
  });

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
    coveragePercent: coverage.percent,
    missingFacets: documentationChecklist.items
      .filter((item) => item.state === "missing")
      .map((item) => item.id),
    coverageWhisper: checklistWhisper(documentationChecklist),
    documentationChecklist,
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
  if (fieldRequirementIds.size === 0) {
    return progress.capturedCount >= 1;
  }
  return !progress.missingRequirementIds.some((id) => fieldRequirementIds.has(id));
}

export function verificationRequirementsSatisfied(progress: EngineIntakeProgress): boolean {
  if (progress.requiredCount === 0) {
    return progress.capturedCount >= 1 && progress.rejectedPhotoIds.length === 0;
  }
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

export function canFinishFieldDocumentation(
  job: Pick<EngineIntakeJob, "expectedIdentity" | "progress">,
): boolean {
  return canFinishWarehouseCapture({
    serialCode: job.expectedIdentity.serialCode,
    photoCount: job.progress.capturedCount,
  });
}

export function canReleaseEngineForSale(
  job: Pick<
    EngineIntakeJob,
    "state" | "location" | "progress" | "expectedIdentity" | "documentationChecklist"
  >,
  overrideReason?: string | null,
): boolean {
  return canReleaseWithChecklist({
    state: job.state,
    serialCode: job.expectedIdentity.serialCode,
    photoCount: job.progress.capturedCount,
    checklist: job.documentationChecklist,
    overrideReason,
  });
}

/** Legacy Progress bars: completed / active items ratio from checklist when provided. */
export function engineIntakeCompletionPercent(
  progress: Pick<
    EngineIntakeProgress,
    "requiredCount" | "satisfiedCount" | "coveragePercent" | "capturedCount"
  >,
  checklist?: DocumentationChecklist | null,
): number {
  if (checklist) {
    const active = checklist.items.filter((item) => item.state !== "not_applicable");
    if (active.length === 0) return 0;
    return Math.round((checklist.summary.completedCount / active.length) * 100);
  }
  if (typeof progress.coveragePercent === "number" && progress.capturedCount > 0) {
    return progress.coveragePercent;
  }
  if (progress.requiredCount <= 0) {
    return progress.capturedCount > 0 ? Math.min(100, progress.capturedCount * 12) : 0;
  }
  return Math.round(
    Math.min(1, Math.max(0, progress.satisfiedCount / progress.requiredCount)) * 100,
  );
}

export function warehouseLifecycleLabel(
  state: EngineIntakeJobState,
): "Draft" | "Documenting" | "Ready" | "In review" | "Released" | "Needs attention" | "Closed" {
  switch (state) {
    case "open":
      return "Draft";
    case "in_session":
    case "paused":
      return "Documenting";
    case "awaiting_verification":
      return "Ready";
    case "rework":
    case "quarantine":
      return "Needs attention";
    case "verified":
      return "Released";
    case "closed":
    case "cancelled":
    case "rejected":
      return "Closed";
    default:
      return "Documenting";
  }
}
