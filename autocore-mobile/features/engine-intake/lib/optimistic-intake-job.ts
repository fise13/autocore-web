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
    state: job.state === 'open' || job.state === 'paused' || job.state === 'rework' ? 'in_session' : job.state,
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

export function mergeIntakeJobs(
  server: EngineIntakeJob[],
  local: EngineIntakeJob[],
): EngineIntakeJob[] {
  if (local.length === 0) return server;
  const ids = new Set(server.map((job) => job.id));
  const extras = local.filter((job) => !ids.has(job.id));
  return extras.length === 0 ? server : [...extras, ...server];
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
