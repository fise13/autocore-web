import {
  DEFAULT_ENGINE_INTAKE_PACKAGE_ID,
  DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
  emptyEngineIntakeProgress,
  seedDocumentationChecklist,
  type EngineIntakeJob,
  type EngineIntakeSession,
} from '@autocore/engine-intake';

export type OptimisticIntakeIdentity = {
  serialCode: string;
  brandName: string;
  engineCode: string;
};

export function buildOptimisticIntakeSession(input: {
  companyId: string;
  jobId: string;
  sessionId: string;
  engineId: string;
  uid: string;
  displayName: string | null;
  deviceId: string;
  deviceName: string | null;
  now?: string;
}): EngineIntakeSession {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.sessionId,
    companyId: input.companyId,
    jobId: input.jobId,
    engineId: input.engineId,
    userId: input.uid,
    userName: input.displayName,
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    mode: 'initial',
    state: 'active',
    syncState: 'queued',
    startedAt: now,
    updatedAt: now,
    pausedAt: null,
    completedAt: null,
    cancelledAt: null,
    lastHeartbeatAt: now,
    fieldCompletionOverrideReason: null,
  };
}

export function buildOptimisticIntakeJob(input: {
  companyId: string;
  jobId: string;
  sessionId: string;
  uid: string;
  displayName: string | null;
  deviceId: string;
  identity: OptimisticIntakeIdentity;
  now?: string;
}): EngineIntakeJob {
  const now = input.now ?? new Date().toISOString();
  const requirements = [...DEFAULT_ENGINE_INTAKE_REQUIREMENTS];
  const serialCode = input.identity.serialCode.trim();
  return {
    id: input.jobId,
    companyId: input.companyId,
    engineId: input.jobId,
    engineOwnerUid: input.uid,
    engineDocPath: `companies/${input.companyId}/engines/${input.jobId}`,
    source: 'ad_hoc',
    sourceReference: '',
    state: 'in_session',
    priority: 'normal',
    expectedIdentity: {
      serialCode,
      brandName: input.identity.brandName.trim(),
      engineCode: input.identity.engineCode.trim(),
      donorVin: '',
      configuration: '',
    },
    photoPackageTemplateId: DEFAULT_ENGINE_INTAKE_PACKAGE_ID,
    photoPackageVersion: 2,
    requirements,
    progress: emptyEngineIntakeProgress(requirements),
    documentationChecklist: seedDocumentationChecklist({ serialConfirmed: serialCode.length > 0 }),
    assignment: {
      assigneeUid: input.uid,
      assigneeName: input.displayName,
      claimedByUid: input.uid,
      claimedByName: input.displayName,
      activeSessionId: input.sessionId,
      claimDeviceId: input.deviceId,
      claimedAt: now,
      claimExpiresAt: null,
      lastHeartbeatAt: now,
    },
    location: null,
    identityConfirmation: null,
    identityMismatch: null,
    verificationLock: null,
    verification: null,
    blockingAiFlags: [],
    activeReworkRequestId: null,
    dueAt: null,
    createdByUid: input.uid,
    createdByName: input.displayName,
    createdAt: now,
    updatedAt: now,
    fieldCompletedAt: null,
    verifiedAt: null,
    revision: 0,
  };
}

export function applyOptimisticClaim(
  job: EngineIntakeJob,
  input: {
    sessionId: string;
    uid: string;
    displayName: string | null;
    deviceId: string;
    now?: string;
  },
): EngineIntakeJob {
  const now = input.now ?? new Date().toISOString();
  return {
    ...job,
    state:
      job.state === 'open' ||
      job.state === 'paused' ||
      job.state === 'rework' ||
      job.state === 'awaiting_verification'
        ? 'in_session'
        : job.state,
    updatedAt: now,
    assignment: {
      ...job.assignment,
      claimedByUid: input.uid,
      claimedByName: input.displayName,
      activeSessionId: input.sessionId,
      claimDeviceId: input.deviceId,
      claimedAt: now,
      lastHeartbeatAt: now,
    },
  };
}

/** Mirror server field_complete — Finish clears the claim and parks the bay in Ready. */
export function applyOptimisticFieldComplete(
  job: EngineIntakeJob,
  now = new Date().toISOString(),
): EngineIntakeJob {
  return {
    ...job,
    state: 'awaiting_verification',
    updatedAt: now,
    fieldCompletedAt: now,
    assignment: {
      ...job.assignment,
      claimedByUid: null,
      claimedByName: null,
      activeSessionId: null,
      claimDeviceId: null,
      claimedAt: null,
      claimExpiresAt: null,
      lastHeartbeatAt: null,
    },
  };
}

const FIELD_COMPLETE_SETTLED = new Set([
  'awaiting_verification',
  'quarantine',
  'verified',
  'closed',
  'rejected',
  'cancelled',
]);

/**
 * Finish can land on the server (web already shows In review) while the phone
 * Firestore listener still holds `in_session`. Force Ready until the snapshot
 * catches up — same idea as `cancelledJobIds`.
 */
export function applyReadyJobOverrides(
  jobs: EngineIntakeJob[],
  readyJobIds: readonly string[],
  now?: string,
): EngineIntakeJob[] {
  if (readyJobIds.length === 0) return jobs;
  const ready = new Set(readyJobIds);
  const stamp = now ?? new Date().toISOString();
  return jobs.map((job) => {
    if (!ready.has(job.id) || FIELD_COMPLETE_SETTLED.has(job.state)) return job;
    return applyOptimisticFieldComplete(job, stamp);
  });
}

export function mergeIntakeJobs(
  server: EngineIntakeJob[],
  local: EngineIntakeJob[],
  cancelledJobIds: readonly string[] = [],
  verifiedJobIds: readonly string[] = [],
): EngineIntakeJob[] {
  const hidden = new Set([...cancelledJobIds, ...verifiedJobIds]);
  const visibleServer = hidden.size === 0
    ? server
    : server.filter((job) => !hidden.has(job.id) && job.state !== 'cancelled');
  const overlayById = new Map(local.map((job) => [job.id, job]));
  const merged = visibleServer.map((job) => {
    const overlay = overlayById.get(job.id);
    if (!overlay) return job;
    // A local claim the server has not echoed yet — keep the camera open.
    const overlayClaimed = Boolean(overlay.assignment.activeSessionId);
    const serverClaimed = Boolean(job.assignment.activeSessionId);
    if (overlayClaimed && !serverClaimed) return overlay;
    return job;
  });
  const extras = local.filter(
    (job) =>
      !visibleServer.some((item) => item.id === job.id) &&
      !hidden.has(job.id) &&
      job.state !== 'cancelled',
  );
  if (extras.length === 0) return merged;
  return [...extras, ...merged];
}

export function mergeIntakeSessions(
  server: EngineIntakeSession[],
  local: EngineIntakeSession[],
): EngineIntakeSession[] {
  if (local.length === 0) return server;
  const ids = new Set(server.map((session) => session.id));
  const extras = local.filter((session) => !ids.has(session.id));
  return extras.length === 0 ? server : [...extras, ...server];
}
