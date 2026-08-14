import type { MotorQualityGrade } from "./quality";

export const ENGINE_INTAKE_JOB_STATES = [
  "open",
  "in_session",
  "paused",
  "awaiting_verification",
  "rework",
  "verified",
  "quarantine",
  "rejected",
  "closed",
  "cancelled",
] as const;

export type EngineIntakeJobState = (typeof ENGINE_INTAKE_JOB_STATES)[number];

export const ENGINE_INTAKE_SESSION_STATES = [
  "active",
  "paused",
  "completed_local",
  "completed",
  "cancelled",
  "stale",
  "merged",
  "archived",
] as const;

export type EngineIntakeSessionState = (typeof ENGINE_INTAKE_SESSION_STATES)[number];

export const ENGINE_INTAKE_SOURCES = [
  "dismantle",
  "purchase",
  "transfer",
  "ad_hoc",
] as const;

export type EngineIntakeSource = (typeof ENGINE_INTAKE_SOURCES)[number];

export const ENGINE_INTAKE_PRIORITIES = ["normal", "high", "urgent"] as const;

export type EngineIntakePriority = (typeof ENGINE_INTAKE_PRIORITIES)[number];

export const ENGINE_INTAKE_SESSION_MODES = ["initial", "rework", "recovery"] as const;

export type EngineIntakeSessionMode = (typeof ENGINE_INTAKE_SESSION_MODES)[number];

export const INTAKE_PHOTO_CATEGORIES = [
  "serial_plate",
  "overview",
  "overview_front",
  "overview_rear",
  "overview_left",
  "overview_right",
  "overview_top",
  "valve_cover",
  "oil_pan",
  "turbo",
  "intake",
  "exhaust",
  "damage",
  "harness",
  "mounts",
  "accessories",
  "temporary_tag",
  "other",
] as const;

export type IntakePhotoCategory = (typeof INTAKE_PHOTO_CATEGORIES)[number];

export type IntakeTimestamp = string | null;

export type IntakeSyncState = "dirty" | "queued" | "syncing" | "synced" | "failed";

export type PhotoRequirementStrictness = "field" | "verification";

export type PhotoRequirement = {
  id: string;
  category: IntakePhotoCategory;
  label: string;
  guidance: string;
  required: boolean;
  minCount: number;
  strictness: PhotoRequirementStrictness;
};

export type PhotoPackageTemplate = {
  id: string;
  companyId: string;
  name: string;
  version: number;
  isDefault: boolean;
  requirements: PhotoRequirement[];
  createdAt: IntakeTimestamp;
  updatedAt: IntakeTimestamp;
};

export type EngineIntakeIdentity = {
  serialCode: string;
  brandName: string;
  engineCode: string;
  donorVin: string;
  configuration: string;
};

export type EngineIntakeLocation = {
  locationId: string;
  code: string;
  warehouseId?: string;
  isStaging: boolean;
  setByUid: string;
  setAt: IntakeTimestamp;
};

export type EngineIntakeAssignment = {
  assigneeUid: string | null;
  assigneeName: string | null;
  claimedByUid: string | null;
  claimedByName: string | null;
  activeSessionId: string | null;
  claimDeviceId: string | null;
  claimedAt: IntakeTimestamp;
  claimExpiresAt: IntakeTimestamp;
  lastHeartbeatAt: IntakeTimestamp;
};

export type EngineIntakeProgress = {
  requiredCount: number;
  satisfiedCount: number;
  capturedCount: number;
  uploadedCount: number;
  acceptedCount: number;
  requirementCounts: Record<string, number>;
  missingRequirementIds: string[];
  rejectedPhotoIds: string[];
  syncQueueDepth: number;
  /**
   * @deprecated Product truth is documentationChecklist — kept for legacy clients.
   */
  coveragePercent: number;
  missingFacets: string[];
  coverageWhisper: string | null;
};

export type EngineIntakeVerificationDecision =
  | "approved"
  | "rework_requested"
  | "quarantined"
  | "rejected";

export type EngineIntakeVerification = {
  decision: EngineIntakeVerificationDecision;
  reviewerUid: string;
  reviewerName: string | null;
  reviewedAt: IntakeTimestamp;
  note: string;
  checklistSnapshot: {
    identityComplete: boolean;
    locationSet: boolean;
    requirementsSatisfied: boolean;
    blockingAiFlags: string[];
  };
};

export type EngineIntakeVerificationLock = {
  reviewerUid: string;
  reviewerName: string | null;
  lockedAt: IntakeTimestamp;
  expiresAt: IntakeTimestamp;
};

export type EngineIntakeIdentityConfirmation = {
  sessionId: string;
  confirmedByUid: string;
  confirmedAt: IntakeTimestamp;
};

export type EngineIntakeIdentityMismatch = {
  sessionId: string;
  reportedByUid: string;
  reason: string;
  reportedAt: IntakeTimestamp;
};

export type ReworkGap = {
  requirementId: string;
  reason: string;
  photoId?: string;
};

export type ReworkRequest = {
  id: string;
  companyId: string;
  jobId: string;
  engineId: string;
  requestedByUid: string;
  requestedByName: string | null;
  requestedAt: IntakeTimestamp;
  resolvedAt: IntakeTimestamp;
  note: string;
  gaps: ReworkGap[];
  resolvedRequirementIds: string[];
  state: "open" | "resolved" | "cancelled";
};

export type EngineIntakeJob = {
  id: string;
  companyId: string;
  engineId: string;
  engineOwnerUid: string;
  engineDocPath: string;
  source: EngineIntakeSource;
  sourceReference: string;
  state: EngineIntakeJobState;
  priority: EngineIntakePriority;
  expectedIdentity: EngineIntakeIdentity;
  photoPackageTemplateId: string;
  photoPackageVersion: number;
  requirements: PhotoRequirement[];
  progress: EngineIntakeProgress;
  /** AI-built dismantler checklist — product truth for documentation completeness. */
  documentationChecklist: import("./checklist").DocumentationChecklist;
  assignment: EngineIntakeAssignment;
  location: EngineIntakeLocation | null;
  identityConfirmation: EngineIntakeIdentityConfirmation | null;
  identityMismatch: EngineIntakeIdentityMismatch | null;
  verificationLock: EngineIntakeVerificationLock | null;
  verification: EngineIntakeVerification | null;
  blockingAiFlags: Array<IntakeAiFlag & { photoId: string }>;
  activeReworkRequestId: string | null;
  dueAt: IntakeTimestamp;
  createdByUid: string;
  createdByName: string | null;
  createdAt: IntakeTimestamp;
  updatedAt: IntakeTimestamp;
  fieldCompletedAt: IntakeTimestamp;
  verifiedAt: IntakeTimestamp;
  revision: number;
};

export type EngineIntakeSession = {
  id: string;
  companyId: string;
  jobId: string;
  engineId: string;
  userId: string;
  userName: string | null;
  deviceId: string;
  deviceName: string | null;
  mode: EngineIntakeSessionMode;
  state: EngineIntakeSessionState;
  syncState: IntakeSyncState;
  startedAt: IntakeTimestamp;
  updatedAt: IntakeTimestamp;
  pausedAt: IntakeTimestamp;
  completedAt: IntakeTimestamp;
  cancelledAt: IntakeTimestamp;
  lastHeartbeatAt: IntakeTimestamp;
  fieldCompletionOverrideReason: string | null;
};

export type IntakePhotoReviewDecision = "accepted" | "rejected" | "retake_requested";

export type IntakePhotoReview = {
  id: string;
  companyId: string;
  jobId: string;
  engineId: string;
  photoId: string;
  decision: IntakePhotoReviewDecision;
  reason: string;
  reviewerUid: string;
  reviewerName: string | null;
  reviewedAt: IntakeTimestamp;
};

export type IntakeAiFlagSeverity = "info" | "warning" | "blocking";

export type IntakeAiFlag = {
  code:
    | "blur"
    | "underexposed"
    | "glare"
    | "incomplete_frame"
    | "wrong_category"
    | "irrelevant"
    | "watermark"
    | "duplicate_engine"
    | "mixed_engine_set"
    | "damage"
    | "missing_component"
    | "exif_anomaly";
  severity: IntakeAiFlagSeverity;
  confidence: number;
  message: string;
  dismissedByUid?: string;
  dismissedAt?: IntakeTimestamp;
};

export type IntakeAiInspectionResult = {
  id: string;
  companyId: string;
  jobId: string;
  engineId: string;
  photoId: string | null;
  model: string;
  modelVersion: string;
  state: "queued" | "processing" | "completed" | "failed";
  suggestedCategory: IntakePhotoCategory | null;
  suggestedIdentity: Partial<EngineIntakeIdentity>;
  /** Optional free-text caption of what the model saw. */
  photoLabel?: string | null;
  checklistHits?: string[];
  hitConfidence?: number | null;
  flags: IntakeAiFlag[];
  listingReadinessScore: number | null;
  createdAt: IntakeTimestamp;
  completedAt: IntakeTimestamp;
};

export type IntakePhoto = {
  id: string;
  companyId: string;
  jobId: string;
  engineId: string;
  sessionId: string;
  requirementId: string | null;
  category: IntakePhotoCategory;
  categorySource: "worker" | "ai" | "system";
  localUri: string | null;
  storagePath: string | null;
  url: string | null;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  capturedByUid: string;
  capturedOnDeviceId: string;
  capturedAt: IntakeTimestamp;
  uploadedAt: IntakeTimestamp;
  syncState: IntakeSyncState;
  reviewDecision: IntakePhotoReviewDecision | null;
  aiInspectionState: "none" | "queued" | "processing" | "completed" | "failed";
  /** Short AI/manager label of what the photo shows, e.g. "Valve cover top". */
  aiLabel?: string | null;
  checklistHits?: string[];
  hitConfidence?: number | null;
  deletedAt: IntakeTimestamp;
};

export type IntakeClient = "desktop" | "mobile" | "server" | "ai";

export type IntakeEvent = {
  id: string;
  companyId: string;
  jobId: string;
  engineId: string;
  sessionId: string | null;
  actorId: string;
  actorName: string | null;
  actorRole: string | null;
  deviceId: string | null;
  client: IntakeClient;
  type: string;
  payload: Record<string, string | number | boolean | null | string[]>;
  clientAt: IntakeTimestamp;
  serverAt: IntakeTimestamp;
  idempotencyKey: string;
};

export type IntakeSyncQueueItem =
  | {
      id: string;
      kind: "command";
      companyId: string;
      jobId: string | null;
      sessionId: string | null;
      command: EngineIntakeCommand;
      attempts: number;
      createdAt: string;
      lastAttemptAt: string | null;
      lastError: string | null;
    }
  | {
      id: string;
      kind: "photo_upload";
      companyId: string;
      jobId: string;
      sessionId: string;
      localUri: string;
      requirementId: string | null;
      category: IntakePhotoCategory;
      contentType: string;
      sizeBytes: number;
      attempts: number;
      createdAt: string;
      lastAttemptAt: string | null;
      lastError: string | null;
    };

export type EngineIntakeCommand = (
  | {
      type: "create_job";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: {
        jobId?: string;
        source: EngineIntakeSource;
        sourceReference?: string;
        priority?: EngineIntakePriority;
        expectedIdentity?: Partial<EngineIntakeIdentity>;
        assigneeUid?: string | null;
        assigneeName?: string | null;
        photoPackageTemplateId?: string;
        targetLocationId?: string | null;
        targetLocationCode?: string | null;
        dueAt?: string | null;
      };
    }
  | {
      type: "claim_job";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId: string;
      payload: { jobId: string; sessionId?: string; deviceName?: string | null };
    }
  | {
      type:
        | "heartbeat_session"
        | "pause_session"
        | "resume_session"
        | "cancel_session"
        | "confirm_identity"
        | "report_identity_mismatch";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId: string;
      payload: { jobId: string; sessionId: string; reason?: string };
    }
  | {
      type: "set_location";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId: string;
      payload: {
        jobId: string;
        sessionId: string;
        locationId: string;
        code: string;
        warehouseId?: string;
        isStaging?: boolean;
      };
    }
  | {
      type: "field_complete";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId: string;
      payload: { jobId: string; sessionId: string; overrideReason?: string };
    }
  | {
      type: "update_identity";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: { jobId: string; identity: Partial<EngineIntakeIdentity> };
    }
  | {
      type: "reassign_job";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: { jobId: string; assigneeUid: string | null; assigneeName?: string | null };
    }
  | {
      type: "release_claim" | "pause_job" | "resume_job" | "cancel_job";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: { jobId: string; reason?: string };
    }
  | {
      type: "start_verification" | "release_verification" | "close_job";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: { jobId: string };
    }
  | {
      type: "merge_session";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: {
        jobId: string;
        sourceSessionId: string;
        targetSessionId: string;
        reason?: string;
      };
    }
  | {
      type: "archive_session";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: { jobId: string; sessionId: string };
    }
  | {
      type: "request_rework";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: { jobId: string; note: string; gaps: ReworkGap[] };
    }
  | {
      type: "approve_job";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: {
        jobId: string;
        note?: string;
        identity?: Partial<EngineIntakeIdentity>;
        aiOverrideReason?: string;
        /** Canonical motor grade written onto the engine at release. */
        quality?: MotorQualityGrade;
      };
    }
  | {
      type: "override_checklist_item";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: {
        jobId: string;
        itemId: string;
        state: "completed" | "missing" | "uncertain" | "not_applicable";
        rationale?: string;
      };
    }
  | {
      type: "quarantine_job" | "reject_job";
      idempotencyKey: string;
      client: IntakeClient;
      deviceId?: string;
      payload: { jobId: string; reason: string };
    }
) & {
  clientAt?: string;
};

export type EngineIntakeCommandResult = {
  ok: true;
  jobId: string;
  engineId: string;
  sessionId?: string;
  replayed?: boolean;
};

export type PrepareIntakePhotoRequest = {
  jobId: string;
  sessionId: string;
  idempotencyKey: string;
  deviceId: string;
  requirementId: string | null;
  category: IntakePhotoCategory;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  capturedAt: string;
};

export type PrepareIntakePhotoResponse = {
  photoId: string;
  uploadUrl: string;
  storagePath: string;
  downloadToken: string;
  url: string;
  contentType: string;
  alreadyUploaded?: boolean;
};

export type FinalizeIntakePhotoRequest = {
  jobId: string;
  sessionId: string;
  photoId: string;
  idempotencyKey: string;
  deviceId: string;
  storagePath: string;
  downloadToken: string;
  contentType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
};
