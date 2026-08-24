import "server-only";

import { createHash } from "node:crypto";

import {
  DEFAULT_ENGINE_INTAKE_PACKAGE_ID,
  ENGINE_INTAKE_STAGING_LOCATION_CODE,
  ENGINE_INTAKE_STAGING_LOCATION_ID,
  assertEngineIntakeJobTransition,
  assertEngineIntakeSessionTransition,
  canFinishWarehouseCapture,
  canReleaseEngineForSale,
  defaultEngineIntakeIdentity,
  parseMotorQualityGrade,
  defaultEngineIntakePhotoPackage,
  deriveEngineIntakeProgress,
  emptyEngineIntakeAssignment,
  emptyEngineIntakeProgress,
  overrideChecklistItem,
  seedDocumentationChecklist,
  type DocumentationChecklist,
  type DocumentationChecklistItemId,
  type DocumentationChecklistItemState,
  type EngineIntakeAssignment,
  type EngineIntakeCommand,
  type EngineIntakeCommandResult,
  type EngineIntakeIdentity,
  type EngineIntakeJobState,
  type EngineIntakeLocation,
  type EngineIntakeProgress,
  type EngineIntakeSessionState,
  type PhotoRequirement,
} from "@autocore/engine-intake";
import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { findDonorIdByVinAdmin } from "@/infrastructure/firestore/admin/donor-admin";
import type { VerifiedEngineIntakeAccess } from "@/lib/auth/verify-engine-intake-access.server";

const CLAIM_TTL_MS = 30 * 60 * 1_000;
const STALE_AFTER_MS = 2 * 60 * 1_000;
const VERIFICATION_LOCK_TTL_MS = 10 * 60 * 1_000;

type JobDocument = {
  companyId: string;
  engineId: string;
  engineOwnerUid: string;
  engineDocPath: string;
  state: EngineIntakeJobState;
  expectedIdentity: EngineIntakeIdentity;
  requirements: PhotoRequirement[];
  progress: EngineIntakeProgress;
  documentationChecklist?: DocumentationChecklist | null;
  assignment: EngineIntakeAssignment;
  location: Record<string, unknown> | null;
  identityConfirmation: Record<string, unknown> | null;
  activeReworkRequestId: string | null;
  verificationLock: {
    reviewerUid?: string;
    expiresAt?: unknown;
  } | null;
  blockingAiFlags: Array<{
    code: string;
    photoId: string;
    severity: string;
    message?: string;
  }>;
  revision: number;
};

type SessionDocument = {
  userId: string;
  deviceId: string;
  state: EngineIntakeSessionState;
};

export class EngineIntakeCommandError extends Error {
  status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "EngineIntakeCommandError";
    this.status = status;
  }
}

function receiptId(idempotencyKey: string): string {
  return createHash("sha256").update(idempotencyKey).digest("hex");
}

function draftMotorId(jobId: string): string {
  const numeric = Number.parseInt(
    createHash("sha256").update(jobId).digest("hex").slice(0, 12),
    16,
  );
  return String(-numeric);
}

function commandClientAt(command: EngineIntakeCommand): Timestamp {
  const parsed = command.clientAt ? new Date(command.clientAt) : new Date();
  return Timestamp.fromDate(Number.isFinite(parsed.getTime()) ? parsed : new Date());
}

function timestampMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  if (typeof value === "string") return Date.parse(value);
  return 0;
}

function requireJob(snapshot: DocumentSnapshot): JobDocument {
  if (!snapshot.exists) {
    throw new EngineIntakeCommandError("Engine intake job was not found", 404);
  }
  return snapshot.data() as JobDocument;
}

function requireSession(snapshot: DocumentSnapshot): SessionDocument {
  if (!snapshot.exists) {
    throw new EngineIntakeCommandError("Engine intake session was not found", 404);
  }
  return snapshot.data() as SessionDocument;
}

function assertSessionOwner(
  session: SessionDocument,
  access: VerifiedEngineIntakeAccess,
  deviceId: string,
): void {
  if (session.userId !== access.uid) {
    throw new EngineIntakeCommandError("This session belongs to another worker", 403);
  }
  if (session.deviceId !== deviceId) {
    throw new EngineIntakeCommandError("This session is active on another device", 409);
  }
}

function eventPayload(
  values: Record<string, string | number | boolean | null | undefined | string[]>,
): Record<string, string | number | boolean | null | string[]> {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string | number | boolean | null | string[]] =>
      entry[1] !== undefined,
    ),
  );
}

function writeEvent(
  transaction: Transaction,
  jobRef: DocumentReference,
  eventId: string,
  access: VerifiedEngineIntakeAccess,
  command: EngineIntakeCommand,
  engineId: string,
  type: string,
  payload: Record<string, string | number | boolean | null | undefined | string[]> = {},
  sessionId: string | null = null,
): void {
  transaction.set(jobRef.collection("events").doc(eventId), {
    companyId: access.companyId,
    jobId: jobRef.id,
    engineId,
    sessionId,
    actorId: access.uid,
    actorName: access.actorName,
    actorRole: access.actorRole,
    deviceId: command.deviceId ?? null,
    client: command.client,
    type,
    payload: eventPayload(payload),
    clientAt: commandClientAt(command),
    serverAt: FieldValue.serverTimestamp(),
    idempotencyKey: command.idempotencyKey,
  });
}

function writeReceipt(
  transaction: Transaction,
  receiptRef: DocumentReference,
  access: VerifiedEngineIntakeAccess,
  command: EngineIntakeCommand,
  result: EngineIntakeCommandResult,
): void {
  transaction.create(receiptRef, {
    companyId: access.companyId,
    uid: access.uid,
    type: command.type,
    idempotencyKey: command.idempotencyKey,
    result,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function replayedResult(
  snapshot: DocumentSnapshot,
  access: VerifiedEngineIntakeAccess,
  command: EngineIntakeCommand,
): EngineIntakeCommandResult | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (data?.uid !== access.uid || data?.type !== command.type) {
    throw new EngineIntakeCommandError("Idempotency key is already used by another command");
  }
  const result = data?.result as EngineIntakeCommandResult | undefined;
  return result ? { ...result, replayed: true } : null;
}

function jobAssignment(job: JobDocument): EngineIntakeAssignment {
  return job.assignment ?? emptyEngineIntakeAssignment();
}

async function deriveStoredProgress(
  transaction: Transaction,
  jobRef: DocumentReference,
  job: JobDocument,
  reviewOverrides: ReadonlyMap<
    string,
    "accepted" | "rejected" | "retake_requested"
  > = new Map(),
): Promise<EngineIntakeProgress & { documentationChecklist: DocumentationChecklist }> {
  const snapshot = await transaction.get(jobRef.collection("photos"));
  const serialConfirmed = Boolean(
    (job.expectedIdentity as EngineIntakeIdentity | undefined)?.serialCode?.trim(),
  );
  return deriveEngineIntakeProgress(
    job.requirements ?? [],
    snapshot.docs.map((photo) => {
      const data = photo.data();
      return {
        id: photo.id,
        deletedAt: data.deletedAt ?? null,
        syncState: data.syncState ?? "queued",
        url: typeof data.url === "string" ? data.url : null,
        reviewDecision:
          reviewOverrides.get(photo.id) ?? data.reviewDecision ?? null,
        requirementId:
          typeof data.requirementId === "string" ? data.requirementId : null,
        category:
          typeof data.category === "string" ? (data.category as never) : "other",
        checklistHits: Array.isArray(data.checklistHits)
          ? (data.checklistHits as never[])
          : undefined,
        hitConfidence:
          typeof data.hitConfidence === "number" ? data.hitConfidence : undefined,
      };
    }),
    {
      serialConfirmed,
      previousChecklist: job.documentationChecklist ?? null,
    },
  );
}

function splitProgressResult(
  result: EngineIntakeProgress & { documentationChecklist: DocumentationChecklist },
): {
  progress: EngineIntakeProgress;
  documentationChecklist: DocumentationChecklist;
} {
  const { documentationChecklist, ...progress } = result;
  return { progress, documentationChecklist };
}

function engineRef(db: Firestore, job: JobDocument): DocumentReference {
  if (!job.engineDocPath?.startsWith("users/") || !job.engineDocPath.includes("/motors/")) {
    throw new EngineIntakeCommandError("Engine link is invalid", 500);
  }
  return db.doc(job.engineDocPath);
}

function nextIdentity(
  current: EngineIntakeIdentity,
  patch: Partial<EngineIntakeIdentity> | undefined,
): EngineIntakeIdentity {
  return defaultEngineIntakeIdentity({ ...current, ...(patch ?? {}) });
}

async function createJob(
  db: Firestore,
  access: VerifiedEngineIntakeAccess,
  command: Extract<EngineIntakeCommand, { type: "create_job" }>,
): Promise<EngineIntakeCommandResult> {
  const companyRef = db.collection("companies").doc(access.companyId);
  const jobRef = command.payload.jobId
    ? companyRef.collection("engineIntakeJobs").doc(command.payload.jobId)
    : companyRef.collection("engineIntakeJobs").doc();
  const templateId =
    command.payload.photoPackageTemplateId?.trim() || DEFAULT_ENGINE_INTAKE_PACKAGE_ID;
  const templateRef = companyRef.collection("engineIntakePhotoPackages").doc(templateId);
  const receiptRef = companyRef
    .collection("engineIntakeCommandReceipts")
    .doc(receiptId(command.idempotencyKey));
  const motorId = draftMotorId(jobRef.id);
  const motorRef = db.collection("users").doc(access.uid).collection("motors").doc(motorId);
  const donorVin = command.payload.expectedIdentity?.donorVin?.trim().toUpperCase() ?? "";
  const linkedDonorId = donorVin ? await findDonorIdByVinAdmin(access.companyId, donorVin) : null;

  return db.runTransaction(async (transaction) => {
    const [receiptSnapshot, templateSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(templateRef),
    ]);
    const replayed = replayedResult(receiptSnapshot, access, command);
    if (replayed) return replayed;

    const fallbackTemplate = defaultEngineIntakePhotoPackage(access.companyId);
    if (!templateSnapshot.exists && templateId !== DEFAULT_ENGINE_INTAKE_PACKAGE_ID) {
      throw new EngineIntakeCommandError("Photo package template was not found", 404);
    }
    const template = templateSnapshot.exists
      ? (templateSnapshot.data() as {
          name?: string;
          version?: number;
          requirements?: PhotoRequirement[];
        })
      : fallbackTemplate;
    const requirements =
      Array.isArray(template.requirements) && template.requirements.length > 0
        ? template.requirements
        : fallbackTemplate.requirements;
    const expectedIdentity = defaultEngineIntakeIdentity(command.payload.expectedIdentity);
    if (!expectedIdentity.serialCode) {
      throw new EngineIntakeCommandError(
        "Serial number is required to create a Warehouse engine",
        400,
      );
    }
    const assignment: EngineIntakeAssignment = {
      ...emptyEngineIntakeAssignment(),
      assigneeUid: command.payload.assigneeUid ?? null,
      assigneeName: command.payload.assigneeName ?? null,
    };
    const progress = emptyEngineIntakeProgress(requirements);
    const documentationChecklist = seedDocumentationChecklist({
      serialConfirmed: Boolean(expectedIdentity.serialCode),
    });
    const dueAt = command.payload.dueAt
      ? Timestamp.fromDate(new Date(command.payload.dueAt))
      : null;
    const stagingLocation = {
      locationId: ENGINE_INTAKE_STAGING_LOCATION_ID,
      code: ENGINE_INTAKE_STAGING_LOCATION_CODE,
      isStaging: true,
      setByUid: access.uid,
      setAt: FieldValue.serverTimestamp(),
    };

    if (!templateSnapshot.exists) {
      transaction.create(templateRef, {
        ...fallbackTemplate,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    transaction.create(motorRef, {
      companyId: access.companyId,
      localId: Number(motorId),
      serialCode: expectedIdentity.serialCode,
      configuration: expectedIdentity.configuration,
      notes: "",
      quality: "",
      photoUrls: [],
      quantity: 1,
      transmission: "",
      arrivalDate: FieldValue.serverTimestamp(),
      soldDate: null,
      deletedAt: null,
      brandName: expectedIdentity.brandName,
      engineCode: expectedIdentity.engineCode,
      status: "draft",
      intakeStatus: "open",
      intakeJobId: jobRef.id,
      donorId: linkedDonorId,
      primaryLocationId: ENGINE_INTAKE_STAGING_LOCATION_ID,
      primaryLocationCode: ENGINE_INTAKE_STAGING_LOCATION_CODE,
      warehouseLocation: ENGINE_INTAKE_STAGING_LOCATION_CODE,
      createdByUserId: access.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.create(jobRef, {
      companyId: access.companyId,
      engineId: motorId,
      engineOwnerUid: access.uid,
      engineDocPath: motorRef.path,
      source: command.payload.source,
      sourceReference: command.payload.sourceReference?.trim() ?? "",
      state: "open",
      priority: command.payload.priority ?? "normal",
      expectedIdentity,
      photoPackageTemplateId: templateId,
      photoPackageVersion: Number(template.version ?? 2),
      requirements,
      progress,
      documentationChecklist,
      assignment,
      location: stagingLocation,
      targetLocationId: command.payload.targetLocationId ?? ENGINE_INTAKE_STAGING_LOCATION_ID,
      targetLocationCode:
        command.payload.targetLocationCode ?? ENGINE_INTAKE_STAGING_LOCATION_CODE,
      identityConfirmation: null,
      identityMismatch: null,
      verificationLock: null,
      verification: null,
      blockingAiFlags: [],
      activeReworkRequestId: null,
      dueAt,
      createdByUid: access.uid,
      createdByName: access.actorName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      fieldCompletedAt: null,
      verifiedAt: null,
      revision: 1,
    });

    const result: EngineIntakeCommandResult = {
      ok: true,
      jobId: jobRef.id,
      engineId: motorId,
    };
    writeEvent(
      transaction,
      jobRef,
      `${receiptRef.id}-job`,
      access,
      command,
      motorId,
      "job.created",
      {
        source: command.payload.source,
        templateId,
      },
    );
    writeEvent(
      transaction,
      jobRef,
      `${receiptRef.id}-engine`,
      access,
      command,
      motorId,
      "engine.draft_created",
    );
    writeReceipt(transaction, receiptRef, access, command, result);
    return result;
  });
}

async function claimJob(
  db: Firestore,
  access: VerifiedEngineIntakeAccess,
  command: Extract<EngineIntakeCommand, { type: "claim_job" }>,
): Promise<EngineIntakeCommandResult> {
  const companyRef = db.collection("companies").doc(access.companyId);
  const jobRef = companyRef.collection("engineIntakeJobs").doc(command.payload.jobId);
  const receiptRef = companyRef
    .collection("engineIntakeCommandReceipts")
    .doc(receiptId(command.idempotencyKey));
  return db.runTransaction(async (transaction) => {
    const [receiptSnapshot, jobSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(jobRef),
    ]);
    const replayed = replayedResult(receiptSnapshot, access, command);
    if (replayed) return replayed;

    const job = requireJob(jobSnapshot);
    // `paused` is reclaimable — workers leave the camera (session pause / claim
    // lease) with photos still on the phone and must take the bay back to sync.
    // `awaiting_verification` (Ready) can be reopened to add photos; Finish
    // parks it in review again.
    if (!["open", "rework", "in_session", "paused", "awaiting_verification"].includes(job.state)) {
      throw new EngineIntakeCommandError(`Job cannot be claimed while ${job.state}`);
    }
    const assignment = jobAssignment(job);
    if (
      assignment.assigneeUid &&
      assignment.assigneeUid !== access.uid &&
      access.profile.role !== "owner" &&
      access.profile.role !== "admin" &&
      access.profile.role !== "manager"
    ) {
      throw new EngineIntakeCommandError("Job is assigned to another worker", 403);
    }

    if (
      assignment.activeSessionId &&
      assignment.claimedByUid === access.uid &&
      assignment.claimDeviceId === command.deviceId
    ) {
      const result: EngineIntakeCommandResult = {
        ok: true,
        jobId: jobRef.id,
        engineId: job.engineId,
        sessionId: assignment.activeSessionId,
      };
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    const claimAlive =
      Boolean(assignment.activeSessionId) && !activeClaimIsStale(assignment);
    if (claimAlive) {
      throw new EngineIntakeCommandError(
        `Job is claimed by ${assignment.claimedByName || "another worker"}`,
      );
    }

    const previousSessionRef = assignment.activeSessionId
      ? jobRef.collection("sessions").doc(assignment.activeSessionId)
      : null;
    const previousSessionSnapshot = previousSessionRef
      ? await transaction.get(previousSessionRef)
      : null;

    // Never create() on top of an existing session doc (dead claim id, or a
    // client that reused preferSessionId). Mint a fresh id when the preferred
    // one would collide.
    let newSessionRef = command.payload.sessionId
      ? jobRef.collection("sessions").doc(command.payload.sessionId)
      : jobRef.collection("sessions").doc();
    if (
      previousSessionRef &&
      newSessionRef.id === previousSessionRef.id
    ) {
      newSessionRef = jobRef.collection("sessions").doc();
    } else if (command.payload.sessionId) {
      const preferredSnapshot = await transaction.get(newSessionRef);
      if (preferredSnapshot.exists) {
        newSessionRef = jobRef.collection("sessions").doc();
      }
    }

    assertEngineIntakeJobTransition(job.state, "in_session");
    const mode =
      job.state === "rework"
        ? "rework"
        : previousSessionSnapshot?.exists
          ? "recovery"
          : "initial";
    const claimExpiresAt = Timestamp.fromMillis(Date.now() + CLAIM_TTL_MS);
    const nextAssignment: EngineIntakeAssignment = {
      assigneeUid: assignment.assigneeUid ?? access.uid,
      assigneeName: assignment.assigneeName ?? access.actorName,
      claimedByUid: access.uid,
      claimedByName: access.actorName,
      activeSessionId: newSessionRef.id,
      claimDeviceId: command.deviceId,
      claimedAt: FieldValue.serverTimestamp() as unknown as Timestamp,
      claimExpiresAt: claimExpiresAt as unknown as string,
      lastHeartbeatAt: FieldValue.serverTimestamp() as unknown as Timestamp,
    } as unknown as EngineIntakeAssignment;

    if (previousSessionRef && previousSessionSnapshot?.exists) {
      transaction.update(previousSessionRef, {
        state: "stale",
        syncState: "failed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        `${receiptRef.id}-stale`,
        access,
        command,
        job.engineId,
        "session.stale_detected",
        { replacedBySessionId: newSessionRef.id },
        previousSessionRef.id,
      );
      writeEvent(
        transaction,
        jobRef,
        `${receiptRef.id}-released`,
        access,
        command,
        job.engineId,
        "session.claim_released",
        { reason: "Heartbeat or claim lease expired" },
        previousSessionRef.id,
      );
    }
    transaction.create(newSessionRef, {
      companyId: access.companyId,
      jobId: jobRef.id,
      engineId: job.engineId,
      userId: access.uid,
      userName: access.actorName,
      deviceId: command.deviceId,
      deviceName: command.payload.deviceName ?? null,
      mode,
      state: "active",
      syncState: "synced",
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      pausedAt: null,
      completedAt: null,
      cancelledAt: null,
      lastHeartbeatAt: FieldValue.serverTimestamp(),
      fieldCompletionOverrideReason: null,
    });
    transaction.update(jobRef, {
      state: "in_session",
      assignment: nextAssignment,
      // Capture-first: accepting/claiming an engine with a serial is enough —
      // no separate "confirm physical identity" step before free photos.
      identityConfirmation: {
        sessionId: newSessionRef.id,
        confirmedByUid: access.uid,
        confirmedAt: FieldValue.serverTimestamp(),
      },
      identityMismatch: null,
      updatedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
    });
    transaction.update(engineRef(db, job), {
      status: "intake_in_progress",
      intakeStatus: "in_session",
      updatedAt: FieldValue.serverTimestamp(),
    });

    const result: EngineIntakeCommandResult = {
      ok: true,
      jobId: jobRef.id,
      engineId: job.engineId,
      sessionId: newSessionRef.id,
    };
    writeEvent(
      transaction,
      jobRef,
      receiptRef.id,
      access,
      command,
      job.engineId,
      "session.started",
      { mode },
      newSessionRef.id,
    );
    writeReceipt(transaction, receiptRef, access, command, result);
    return result;
  });
}

async function mutateWorkerSession(
  db: Firestore,
  access: VerifiedEngineIntakeAccess,
  command: Extract<
    EngineIntakeCommand,
    {
      type:
        | "heartbeat_session"
        | "pause_session"
        | "resume_session"
        | "cancel_session"
        | "confirm_identity"
        | "report_identity_mismatch"
        | "set_location"
        | "field_complete";
    }
  >,
): Promise<EngineIntakeCommandResult> {
  const companyRef = db.collection("companies").doc(access.companyId);
  const jobRef = companyRef.collection("engineIntakeJobs").doc(command.payload.jobId);
  const sessionRef = jobRef.collection("sessions").doc(command.payload.sessionId);
  const receiptRef = companyRef
    .collection("engineIntakeCommandReceipts")
    .doc(receiptId(command.idempotencyKey));
  const locationRef =
    command.type === "set_location" && !command.payload.isStaging
      ? db.collection("warehouseLocations").doc(command.payload.locationId)
      : null;

  return db.runTransaction(async (transaction) => {
    const [receiptSnapshot, jobSnapshot, sessionSnapshot, locationSnapshot] =
      await Promise.all([
        transaction.get(receiptRef),
        transaction.get(jobRef),
        transaction.get(sessionRef),
        locationRef ? transaction.get(locationRef) : Promise.resolve(null),
      ]);
    const replayed = replayedResult(receiptSnapshot, access, command);
    if (replayed) return replayed;

    const job = requireJob(jobSnapshot);
    const session = requireSession(sessionSnapshot);
    assertSessionOwner(session, access, command.deviceId);
    const assignment = jobAssignment(job);
    if (assignment.activeSessionId !== sessionRef.id) {
      throw new EngineIntakeCommandError("Session claim is no longer active");
    }

    const result: EngineIntakeCommandResult = {
      ok: true,
      jobId: jobRef.id,
      engineId: job.engineId,
      sessionId: sessionRef.id,
    };
    const claimExpiresAt = Timestamp.fromMillis(Date.now() + CLAIM_TTL_MS);

    if (command.type === "heartbeat_session") {
      if (!["active", "paused"].includes(session.state)) {
        throw new EngineIntakeCommandError("Completed session cannot send a heartbeat");
      }
      transaction.update(sessionRef, {
        lastHeartbeatAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobRef, {
        "assignment.lastHeartbeatAt": FieldValue.serverTimestamp(),
        "assignment.claimExpiresAt": claimExpiresAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "pause_session") {
      assertEngineIntakeSessionTransition(session.state, "paused");
      transaction.update(sessionRef, {
        state: "paused",
        pausedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobRef, {
        "assignment.claimExpiresAt": claimExpiresAt,
        "assignment.lastHeartbeatAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "session.paused",
        { reason: command.payload.reason ?? null },
        sessionRef.id,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "resume_session") {
      assertEngineIntakeSessionTransition(session.state, "active");
      assertEngineIntakeJobTransition(job.state, "in_session");
      const derived = await deriveStoredProgress(transaction, jobRef, job);
      const { progress, documentationChecklist } = splitProgressResult(derived);
      transaction.update(sessionRef, {
        state: "active",
        pausedAt: null,
        lastHeartbeatAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobRef, {
        state: "in_session",
        progress,
        documentationChecklist: {
          ...documentationChecklist,
          understandingState:
            documentationChecklist.summary.saleGateMissingCount === 0
              ? "ready"
              : "understanding",
        },
        "assignment.claimExpiresAt": claimExpiresAt,
        "assignment.lastHeartbeatAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "session.resumed",
        {},
        sessionRef.id,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "cancel_session") {
      assertEngineIntakeSessionTransition(session.state, "cancelled");
      const nextState: EngineIntakeJobState = job.activeReworkRequestId ? "rework" : "open";
      assertEngineIntakeJobTransition(job.state, nextState);
      transaction.update(sessionRef, {
        state: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobRef, {
        state: nextState,
        assignment: {
          ...assignment,
          claimedByUid: null,
          claimedByName: null,
          activeSessionId: null,
          claimDeviceId: null,
          claimedAt: null,
          claimExpiresAt: null,
          lastHeartbeatAt: null,
        },
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "session.cancelled",
        { reason: command.payload.reason ?? null },
        sessionRef.id,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "confirm_identity") {
      if (session.state !== "active" || job.state !== "in_session") {
        throw new EngineIntakeCommandError(
          "Resume the active session before confirming the engine",
        );
      }
      transaction.update(jobRef, {
        identityConfirmation: {
          sessionId: sessionRef.id,
          confirmedByUid: access.uid,
          confirmedAt: FieldValue.serverTimestamp(),
        },
        identityMismatch: null,
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "engine.identity_confirmed",
        {},
        sessionRef.id,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "report_identity_mismatch") {
      if (session.state !== "active" || job.state !== "in_session") {
        throw new EngineIntakeCommandError(
          "Only the active session can report an identity mismatch",
        );
      }
      const reason = command.payload.reason?.trim();
      if (!reason) {
        throw new EngineIntakeCommandError("Describe the engine mismatch", 400);
      }
      assertEngineIntakeSessionTransition(session.state, "paused");
      assertEngineIntakeJobTransition(job.state, "paused");
      transaction.update(sessionRef, {
        state: "paused",
        pausedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobRef, {
        state: "paused",
        identityConfirmation: null,
        identityMismatch: {
          sessionId: sessionRef.id,
          reportedByUid: access.uid,
          reason,
          reportedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "engine.identity_mismatch_reported",
        { reason },
        sessionRef.id,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "set_location") {
      if (session.state !== "active") {
        throw new EngineIntakeCommandError("Resume the session before setting location");
      }
      if (locationRef) {
        if (!locationSnapshot?.exists) {
          throw new EngineIntakeCommandError("Warehouse location was not found", 404);
        }
        if (locationSnapshot.data()?.companyId !== access.companyId) {
          throw new EngineIntakeCommandError("Warehouse location belongs to another company", 403);
        }
      }
      const canonicalLocation = locationSnapshot?.data();
      const isStaging = command.payload.isStaging === true;
      const locationId = isStaging
        ? "engine-intake-staging"
        : command.payload.locationId;
      const locationCode = isStaging
        ? "STAGE-INTAKE"
        : locationRef
          ? String(canonicalLocation?.code ?? "").trim()
          : command.payload.code.trim();
      const warehouseId = isStaging
        ? null
        : locationRef
          ? String(canonicalLocation?.warehouseId ?? "").trim() || null
          : command.payload.warehouseId ?? null;
      if (!locationCode) {
        throw new EngineIntakeCommandError("Warehouse location has no code");
      }
      const location = {
        locationId,
        code: locationCode,
        warehouseId,
        isStaging,
        setByUid: access.uid,
        setAt: FieldValue.serverTimestamp(),
      };
      transaction.update(jobRef, {
        location,
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      transaction.update(engineRef(db, job), {
        primaryLocationId: locationId,
        primaryLocationCode: locationCode,
        warehouseLocation: locationCode,
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "engine.location_set",
        {
          locationId,
          code: locationCode,
          isStaging,
        },
        sessionRef.id,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (
      job.state === "awaiting_verification" &&
      (session.state === "completed" || session.state === "completed_local")
    ) {
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (
      session.state !== "active" &&
      session.state !== "paused"
    ) {
      throw new EngineIntakeCommandError("Resume the session before completing field work");
    }
    const fieldPayload = command.payload as {
      jobId: string;
      sessionId: string;
      overrideReason?: string;
    };
    const derived = await deriveStoredProgress(transaction, jobRef, job);
    const { progress, documentationChecklist } = splitProgressResult(derived);
    const serialCode =
      typeof job.expectedIdentity?.serialCode === "string"
        ? job.expectedIdentity.serialCode
        : "";
    if (
      !canFinishWarehouseCapture({
        serialCode,
        photoCount: progress.capturedCount,
      })
    ) {
      throw new EngineIntakeCommandError(
        "Finish needs a serial number and at least one photo",
      );
    }
    if (
      documentationChecklist.summary.saleGateMissingCount > 0 &&
      !fieldPayload.overrideReason?.trim() &&
      progress.capturedCount < 3
    ) {
      // Soft warn: mobile sends overrideReason when saleGate items remain.
    }
    let location = job.location as {
      locationId?: string;
      code?: string;
      isStaging?: boolean;
    } | null;
    if (!location) {
      location = {
        locationId: ENGINE_INTAKE_STAGING_LOCATION_ID,
        code: ENGINE_INTAKE_STAGING_LOCATION_CODE,
        isStaging: true,
      };
      transaction.update(jobRef, {
        location: {
          ...location,
          setByUid: access.uid,
          setAt: FieldValue.serverTimestamp(),
        },
      });
    }
    if (job.activeReworkRequestId) {
      const reworkSnapshot = await transaction.get(
        jobRef.collection("reworkRequests").doc(job.activeReworkRequestId),
      );
      const gaps = Array.isArray(reworkSnapshot.data()?.gaps)
        ? (reworkSnapshot.data()?.gaps as Array<{ requirementId?: string }>)
        : [];
      const resolved = new Set(
        Array.isArray(reworkSnapshot.data()?.resolvedRequirementIds)
          ? (reworkSnapshot.data()?.resolvedRequirementIds as string[])
          : [],
      );
      const unresolved = gaps
        .map((gap) => gap.requirementId)
        .filter(
          (requirementId): requirementId is string =>
            Boolean(requirementId) && !resolved.has(requirementId!),
        );
      if (unresolved.length > 0) {
        throw new EngineIntakeCommandError(
          `Rework photos are still required: ${unresolved.join(", ")}`,
        );
      }
    }
    assertEngineIntakeSessionTransition(session.state, "completed");
    assertEngineIntakeJobTransition(job.state, "awaiting_verification");
    transaction.update(sessionRef, {
      state: "completed",
      syncState: progress.syncQueueDepth > 0 ? "dirty" : "synced",
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      fieldCompletionOverrideReason: fieldPayload.overrideReason?.trim() || null,
    });
    transaction.update(jobRef, {
      state: "awaiting_verification",
      assignment: {
        ...assignment,
        claimedByUid: null,
        claimedByName: null,
        activeSessionId: null,
        claimDeviceId: null,
        claimedAt: null,
        claimExpiresAt: null,
        lastHeartbeatAt: null,
      },
      progress,
      documentationChecklist,
      identityConfirmation: {
        sessionId: sessionRef.id,
        confirmedByUid: access.uid,
        confirmedAt: FieldValue.serverTimestamp(),
      },
      fieldCompletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
    });
    transaction.update(engineRef(db, job), {
      status: "awaiting_verification",
      intakeStatus: "awaiting_verification",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeEvent(
      transaction,
      jobRef,
      receiptRef.id,
      access,
      command,
      job.engineId,
      "session.field_completed",
      {
        missingRequirementIds: progress.missingRequirementIds,
        saleGateMissingCount: documentationChecklist.summary.saleGateMissingCount,
        whisper: documentationChecklist.summary.whisper,
        overrideReason: fieldPayload.overrideReason ?? null,
      },
      sessionRef.id,
    );
    writeReceipt(transaction, receiptRef, access, command, result);
    return result;
  });
}

async function mutateManagedJob(
  db: Firestore,
  access: VerifiedEngineIntakeAccess,
  command: Exclude<
    EngineIntakeCommand,
    {
      type:
        | "create_job"
        | "claim_job"
        | "heartbeat_session"
        | "pause_session"
        | "resume_session"
        | "cancel_session"
        | "set_location"
        | "field_complete";
    }
  >,
): Promise<EngineIntakeCommandResult> {
  const companyRef = db.collection("companies").doc(access.companyId);
  const jobRef = companyRef.collection("engineIntakeJobs").doc(command.payload.jobId);
  const receiptRef = companyRef
    .collection("engineIntakeCommandReceipts")
    .doc(receiptId(command.idempotencyKey));

  return db.runTransaction(async (transaction) => {
    const [receiptSnapshot, jobSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(jobRef),
    ]);
    const replayed = replayedResult(receiptSnapshot, access, command);
    if (replayed) return replayed;
    const job = requireJob(jobSnapshot);
    const assignment = jobAssignment(job);
    const activeSessionRef = assignment.activeSessionId
      ? jobRef.collection("sessions").doc(assignment.activeSessionId)
      : null;
    const activeSessionSnapshot = activeSessionRef
      ? await transaction.get(activeSessionRef)
      : null;
    const result: EngineIntakeCommandResult = {
      ok: true,
      jobId: jobRef.id,
      engineId: job.engineId,
      ...(assignment.activeSessionId ? { sessionId: assignment.activeSessionId } : {}),
    };
    const verificationLockActive =
      Boolean(job.verificationLock?.reviewerUid) &&
      timestampMillis(job.verificationLock?.expiresAt) > Date.now();

    if (command.type === "start_verification") {
      if (!["awaiting_verification", "quarantine"].includes(job.state)) {
        throw new EngineIntakeCommandError("Job is not ready for verification");
      }
      if (
        verificationLockActive &&
        job.verificationLock?.reviewerUid !== access.uid
      ) {
        throw new EngineIntakeCommandError(
          "Another verifier is already reviewing this engine",
        );
      }
      transaction.update(jobRef, {
        verificationLock: {
          reviewerUid: access.uid,
          reviewerName: access.actorName,
          lockedAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(
            Date.now() + VERIFICATION_LOCK_TTL_MS,
          ),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "verification.started",
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "release_verification") {
      if (
        verificationLockActive &&
        job.verificationLock?.reviewerUid !== access.uid
      ) {
        throw new EngineIntakeCommandError(
          "Only the active verifier can release this review",
          403,
        );
      }
      transaction.update(jobRef, {
        verificationLock: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "verification.released",
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "close_job") {
      if (job.state !== "verified") {
        throw new EngineIntakeCommandError(
          "Only a verified intake job can be closed",
        );
      }
      assertEngineIntakeJobTransition(job.state, "closed");
      const sessionsSnapshot = await transaction.get(
        jobRef.collection("sessions"),
      );
      for (const sessionSnapshot of sessionsSnapshot.docs) {
        const session = requireSession(sessionSnapshot);
        if (session.state === "archived") continue;
        assertEngineIntakeSessionTransition(session.state, "archived");
        transaction.update(sessionSnapshot.ref, {
          state: "archived",
          archivedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.update(jobRef, {
        state: "closed",
        verificationLock: null,
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "job.closed",
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "merge_session") {
      if (command.payload.sourceSessionId === command.payload.targetSessionId) {
        throw new EngineIntakeCommandError("A session cannot be merged into itself");
      }
      const sourceRef = jobRef.collection("sessions").doc(command.payload.sourceSessionId);
      const targetRef = jobRef.collection("sessions").doc(command.payload.targetSessionId);
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        transaction.get(sourceRef),
        transaction.get(targetRef),
      ]);
      const source = requireSession(sourceSnapshot);
      requireSession(targetSnapshot);
      assertEngineIntakeSessionTransition(source.state, "merged");
      transaction.update(sourceRef, {
        state: "merged",
        mergedIntoSessionId: targetRef.id,
        mergeReason: command.payload.reason?.trim() ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "session.merged",
        {
          sourceSessionId: sourceRef.id,
          targetSessionId: targetRef.id,
          reason: command.payload.reason ?? null,
        },
        targetRef.id,
      );
      const mergeResult: EngineIntakeCommandResult = {
        ok: true,
        jobId: jobRef.id,
        engineId: job.engineId,
        sessionId: targetRef.id,
      };
      writeReceipt(transaction, receiptRef, access, command, mergeResult);
      return mergeResult;
    }

    if (command.type === "archive_session") {
      const sessionRef = jobRef.collection("sessions").doc(command.payload.sessionId);
      const sessionSnapshot = await transaction.get(sessionRef);
      const session = requireSession(sessionSnapshot);
      assertEngineIntakeSessionTransition(session.state, "archived");
      transaction.update(sessionRef, {
        state: "archived",
        archivedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "session.archived",
        {},
        sessionRef.id,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "update_identity") {
      const identity = nextIdentity(job.expectedIdentity, command.payload.identity);
      transaction.update(jobRef, {
        expectedIdentity: identity,
        identityConfirmation: null,
        identityMismatch: null,
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      transaction.update(engineRef(db, job), {
        serialCode: identity.serialCode,
        brandName: identity.brandName,
        engineCode: identity.engineCode,
        configuration: identity.configuration,
        donorVin: identity.donorVin,
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "engine.identity_updated",
        {
          serialCode: identity.serialCode,
          brandName: identity.brandName,
          engineCode: identity.engineCode,
        },
        assignment.activeSessionId,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "reassign_job") {
      transaction.update(jobRef, {
        "assignment.assigneeUid": command.payload.assigneeUid,
        "assignment.assigneeName": command.payload.assigneeName ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "job.reassigned",
        {
          assigneeUid: command.payload.assigneeUid,
          assigneeName: command.payload.assigneeName ?? null,
        },
        assignment.activeSessionId,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "release_claim") {
      if (!activeSessionRef || !activeSessionSnapshot?.exists) {
        throw new EngineIntakeCommandError("Job has no active claim");
      }
      const nextState: EngineIntakeJobState = job.activeReworkRequestId ? "rework" : "open";
      assertEngineIntakeJobTransition(job.state, nextState);
      transaction.update(activeSessionRef, {
        state: "stale",
        syncState: "failed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobRef, {
        state: nextState,
        assignment: {
          ...assignment,
          claimedByUid: null,
          claimedByName: null,
          activeSessionId: null,
          claimDeviceId: null,
          claimedAt: null,
          claimExpiresAt: null,
          lastHeartbeatAt: null,
        },
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "session.claim_released",
        { reason: command.payload.reason ?? null },
        assignment.activeSessionId,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "pause_job") {
      assertEngineIntakeJobTransition(job.state, "paused");
      if (activeSessionRef && activeSessionSnapshot?.exists) {
        const session = requireSession(activeSessionSnapshot);
        if (session.state === "active") {
          transaction.update(activeSessionRef, {
            state: "paused",
            pausedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
      transaction.update(jobRef, {
        state: "paused",
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "job.paused",
        { reason: command.payload.reason ?? null },
        assignment.activeSessionId,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "resume_job") {
      const nextState: EngineIntakeJobState = assignment.activeSessionId
        ? "in_session"
        : job.activeReworkRequestId
          ? "rework"
          : "open";
      assertEngineIntakeJobTransition(job.state, nextState);
      if (activeSessionRef && activeSessionSnapshot?.exists) {
        const session = requireSession(activeSessionSnapshot);
        if (session.state === "paused") {
          transaction.update(activeSessionRef, {
            state: "active",
            pausedAt: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
      transaction.update(jobRef, {
        state: nextState,
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "job.resumed",
        {},
        assignment.activeSessionId,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "cancel_job") {
      assertEngineIntakeJobTransition(job.state, "cancelled");
      if (activeSessionRef && activeSessionSnapshot?.exists) {
        transaction.update(activeSessionRef, {
          state: "cancelled",
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.update(jobRef, {
        state: "cancelled",
        assignment: emptyEngineIntakeAssignment(),
        verificationLock: null,
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      transaction.update(engineRef(db, job), {
        status: "rejected",
        intakeStatus: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "job.cancelled",
        { reason: command.payload.reason ?? null },
        assignment.activeSessionId,
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (
      verificationLockActive &&
      job.verificationLock?.reviewerUid !== access.uid
    ) {
      throw new EngineIntakeCommandError(
        "Another verifier is already reviewing this engine",
      );
    }
    const derived = await deriveStoredProgress(transaction, jobRef, job);
    const { progress, documentationChecklist: derivedChecklist } =
      splitProgressResult(derived);
    const blockingAiFlags = Array.isArray(job.blockingAiFlags)
      ? job.blockingAiFlags
      : [];
    const blockingAiFlagCodes = blockingAiFlags.map(
      (flag) => `${flag.photoId}:${flag.code}`,
    );

    if (command.type === "override_checklist_item") {
      const itemId = command.payload.itemId as DocumentationChecklistItemId;
      const nextState = command.payload.state as DocumentationChecklistItemState;
      const current = job.documentationChecklist ?? derivedChecklist;
      const next = overrideChecklistItem(
        current,
        itemId,
        nextState,
        command.payload.rationale?.trim() ?? "Manager override",
      );
      transaction.update(jobRef, {
        documentationChecklist: next,
        progress: {
          ...progress,
          coverageWhisper: next.summary.whisper,
          missingFacets: next.items
            .filter((item) => item.state === "missing")
            .map((item) => item.id),
        },
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "checklist.item_overridden",
        {
          itemId,
          state: nextState,
          rationale: command.payload.rationale ?? null,
        },
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "request_rework") {
      if (!["awaiting_verification", "quarantine"].includes(job.state)) {
        throw new EngineIntakeCommandError("Rework can only follow verification");
      }
      const requirementIds = new Set((job.requirements ?? []).map((item) => item.id));
      for (const gap of command.payload.gaps) {
        if (!requirementIds.has(gap.requirementId)) {
          throw new EngineIntakeCommandError(`Unknown photo requirement: ${gap.requirementId}`);
        }
      }
      const reviewOverrides = new Map<
        string,
        "accepted" | "rejected" | "retake_requested"
      >(
        command.payload.gaps.flatMap((gap) =>
          gap.photoId ? [[gap.photoId, "retake_requested"] as const] : [],
        ),
      );
      const reviewedProgress =
        reviewOverrides.size > 0
          ? await deriveStoredProgress(
              transaction,
              jobRef,
              job,
              reviewOverrides,
            )
          : progress;
      const reworkRef = jobRef.collection("reworkRequests").doc();
      const missingRequirementIds = Array.from(
        new Set([
          ...reviewedProgress.missingRequirementIds,
          ...command.payload.gaps.map((gap) => gap.requirementId),
        ]),
      );
      const rejectedPhotoIds = reviewedProgress.rejectedPhotoIds;

      for (const [index, gap] of command.payload.gaps.entries()) {
        if (!gap.photoId) continue;
        const reviewRef = jobRef.collection("photoReviews").doc(`${reworkRef.id}-${index}`);
        transaction.create(reviewRef, {
          companyId: access.companyId,
          jobId: jobRef.id,
          engineId: job.engineId,
          photoId: gap.photoId,
          decision: "retake_requested",
          reason: gap.reason,
          reviewerUid: access.uid,
          reviewerName: access.actorName,
          reviewedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(jobRef.collection("photos").doc(gap.photoId), {
          reviewDecision: "retake_requested",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.create(reworkRef, {
        companyId: access.companyId,
        jobId: jobRef.id,
        engineId: job.engineId,
        requestedByUid: access.uid,
        requestedByName: access.actorName,
        requestedAt: FieldValue.serverTimestamp(),
        resolvedAt: null,
        note: command.payload.note,
        gaps: command.payload.gaps,
        resolvedRequirementIds: [],
        state: "open",
      });
      transaction.update(jobRef, {
        state: "rework",
        verificationLock: null,
        activeReworkRequestId: reworkRef.id,
        verification: {
          decision: "rework_requested",
          reviewerUid: access.uid,
          reviewerName: access.actorName,
          reviewedAt: FieldValue.serverTimestamp(),
          note: command.payload.note,
          checklistSnapshot: {
            identityComplete: Boolean(
              job.expectedIdentity.serialCode || job.expectedIdentity.engineCode,
            ),
            locationSet: Boolean(job.location),
            requirementsSatisfied: false,
            blockingAiFlags: blockingAiFlagCodes,
          },
        },
        progress: {
          ...reviewedProgress,
          missingRequirementIds,
          rejectedPhotoIds,
        },
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      transaction.update(engineRef(db, job), {
        status: "intake_in_progress",
        intakeStatus: "rework",
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        receiptRef.id,
        access,
        command,
        job.engineId,
        "verification.rework_requested",
        {
          reworkRequestId: reworkRef.id,
          requirementIds: command.payload.gaps.map((gap) => gap.requirementId),
        },
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    if (command.type === "approve_job") {
      if (job.state !== "awaiting_verification") {
        throw new EngineIntakeCommandError("Job is not awaiting verification");
      }
      const identity = nextIdentity(job.expectedIdentity, command.payload.identity);
      const checklist =
        job.documentationChecklist ?? derivedChecklist;
      const aiOverrideReason = command.payload.aiOverrideReason?.trim() ?? "";
      const releaseOverride =
        command.payload.note?.trim() ||
        aiOverrideReason ||
        (checklist.summary.ready ? "checklist-ready" : "");
      if (
        !canReleaseEngineForSale(
          {
            state: job.state,
            location: (job.location as EngineIntakeLocation | null) ?? null,
            progress,
            expectedIdentity: identity,
            documentationChecklist: checklist,
          },
          releaseOverride,
        )
      ) {
        throw new EngineIntakeCommandError(
          "Release needs a serial, photos, and completed sale checklist (or a manager override note)",
        );
      }
      if (progress.capturedCount < 1) {
        throw new EngineIntakeCommandError("Cannot release an engine with zero photos");
      }
      if (blockingAiFlags.length > 0 && !aiOverrideReason) {
        throw new EngineIntakeCommandError(
          "Resolve or explicitly override blocking AI flags before approval",
        );
      }
      if (!identity.serialCode) {
        throw new EngineIntakeCommandError(
          "Confirm a serial number before releasing to Motors Grid",
        );
      }
      const quality = parseMotorQualityGrade(command.payload.quality ?? "");
      if (!quality) {
        throw new EngineIntakeCommandError(
          "Set engine quality (1, 2, or 3) before releasing to Motors Grid",
        );
      }
      if (!job.location) {
        transaction.update(jobRef, {
          location: {
            locationId: ENGINE_INTAKE_STAGING_LOCATION_ID,
            code: ENGINE_INTAKE_STAGING_LOCATION_CODE,
            isStaging: true,
            setByUid: access.uid,
            setAt: FieldValue.serverTimestamp(),
          },
        });
      }
      const verification = {
        decision: "approved",
        reviewerUid: access.uid,
        reviewerName: access.actorName,
        reviewedAt: FieldValue.serverTimestamp(),
        note: command.payload.note?.trim() ?? "",
        checklistSnapshot: {
          identityComplete: Boolean(identity.serialCode),
          locationSet: true,
          requirementsSatisfied: true,
          blockingAiFlags: blockingAiFlagCodes,
          saleGateMissingCount: checklist.summary.saleGateMissingCount,
          completedCount: checklist.summary.completedCount,
        },
      };
      const photosSnapshot = await transaction.get(jobRef.collection("photos"));
      let acceptedCount = 0;
      for (const photoSnapshot of photosSnapshot.docs) {
        const photo = photoSnapshot.data();
        if (
          photo.deletedAt != null ||
          photo.syncState !== "synced" ||
          typeof photo.url !== "string" ||
          !photo.url ||
          photo.reviewDecision === "rejected" ||
          photo.reviewDecision === "retake_requested"
        ) {
          continue;
        }
        acceptedCount += 1;
        transaction.set(
          jobRef.collection("photoReviews").doc(`${receiptRef.id}-${photoSnapshot.id}`),
          {
            companyId: access.companyId,
            jobId: jobRef.id,
            engineId: job.engineId,
            photoId: photoSnapshot.id,
            decision: "accepted",
            reason: command.payload.note?.trim() ?? "",
            reviewerUid: access.uid,
            reviewerName: access.actorName,
            reviewedAt: FieldValue.serverTimestamp(),
          },
        );
        transaction.update(photoSnapshot.ref, {
          reviewDecision: "accepted",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.update(jobRef, {
        state: "verified",
        expectedIdentity: identity,
        verification,
        verificationLock: null,
        activeReworkRequestId: null,
        progress: {
          ...progress,
          acceptedCount,
        },
        ...(blockingAiFlags.length > 0 ? { blockingAiFlags: [] } : {}),
        verifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        revision: FieldValue.increment(1),
      });
      if (job.activeReworkRequestId) {
        transaction.update(
          jobRef.collection("reworkRequests").doc(job.activeReworkRequestId),
          {
            state: "resolved",
            resolvedAt: FieldValue.serverTimestamp(),
          },
        );
      }
      transaction.update(engineRef(db, job), {
        serialCode: identity.serialCode,
        brandName: identity.brandName,
        engineCode: identity.engineCode,
        configuration: identity.configuration,
        donorVin: identity.donorVin,
        quality,
        status: "available",
        intakeStatus: "verified",
        readyForSaleAt: FieldValue.serverTimestamp(),
        verifiedByUserId: access.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeEvent(
        transaction,
        jobRef,
        `${receiptRef.id}-verification`,
        access,
        command,
        job.engineId,
        "verification.approved",
      );
      if (blockingAiFlags.length > 0) {
        writeEvent(
          transaction,
          jobRef,
          `${receiptRef.id}-ai-override`,
          access,
          command,
          job.engineId,
          "ai.flag_dismissed",
          {
            flagCodes: blockingAiFlagCodes,
            reason: aiOverrideReason,
          },
        );
      }
      writeEvent(
        transaction,
        jobRef,
        `${receiptRef.id}-sale`,
        access,
        command,
        job.engineId,
        "sale.readied",
      );
      writeReceipt(transaction, receiptRef, access, command, result);
      return result;
    }

    const decisionCommand = command as Extract<
      EngineIntakeCommand,
      { type: "quarantine_job" | "reject_job" }
    >;
    const nextState: EngineIntakeJobState =
      decisionCommand.type === "quarantine_job" ? "quarantine" : "rejected";
    if (
      decisionCommand.type === "quarantine_job" &&
      job.state !== "awaiting_verification"
    ) {
      throw new EngineIntakeCommandError("Only a job in verification can be quarantined");
    }
    if (
      decisionCommand.type === "reject_job" &&
      !["awaiting_verification", "quarantine"].includes(job.state)
    ) {
      throw new EngineIntakeCommandError("Job cannot be rejected from its current state");
    }
    assertEngineIntakeJobTransition(job.state, nextState);
    transaction.update(jobRef, {
      state: nextState,
      verificationLock: null,
      verification: {
        decision:
          decisionCommand.type === "quarantine_job" ? "quarantined" : "rejected",
        reviewerUid: access.uid,
        reviewerName: access.actorName,
        reviewedAt: FieldValue.serverTimestamp(),
        note: decisionCommand.payload.reason,
        checklistSnapshot: {
          identityComplete: Boolean(
            job.expectedIdentity.serialCode || job.expectedIdentity.engineCode,
          ),
          locationSet: Boolean(job.location),
          requirementsSatisfied: progress.missingRequirementIds.length === 0,
          blockingAiFlags: blockingAiFlagCodes,
        },
      },
      updatedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
    });
    transaction.update(engineRef(db, job), {
      status: nextState,
      intakeStatus: nextState,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeEvent(
      transaction,
      jobRef,
      receiptRef.id,
      access,
      command,
      job.engineId,
      decisionCommand.type === "quarantine_job"
        ? "verification.quarantined"
        : "verification.rejected",
      { reason: decisionCommand.payload.reason },
    );
    writeReceipt(transaction, receiptRef, access, command, result);
    return result;
  });
}

export async function executeEngineIntakeCommand(
  access: VerifiedEngineIntakeAccess,
  command: EngineIntakeCommand,
): Promise<EngineIntakeCommandResult> {
  const db = getAdminFirestore();

  if (command.type === "create_job") {
    return createJob(db, access, command);
  }
  if (command.type === "claim_job") {
    return claimJob(db, access, command);
  }
  if (
    command.type === "heartbeat_session" ||
    command.type === "pause_session" ||
    command.type === "resume_session" ||
    command.type === "cancel_session" ||
    command.type === "confirm_identity" ||
    command.type === "report_identity_mismatch" ||
    command.type === "set_location" ||
    command.type === "field_complete"
  ) {
    return mutateWorkerSession(
      db,
      access,
      command as Parameters<typeof mutateWorkerSession>[2],
    );
  }
  return mutateManagedJob(
    db,
    access,
    command as Parameters<typeof mutateManagedJob>[2],
  );
}

export function activeClaimIsStale(
  assignment: Pick<EngineIntakeAssignment, "lastHeartbeatAt" | "claimExpiresAt">,
  now = Date.now(),
): boolean {
  const heartbeat = timestampMillis(assignment.lastHeartbeatAt);
  const expires = timestampMillis(assignment.claimExpiresAt);
  return expires <= now || heartbeat <= 0 || now - heartbeat > STALE_AFTER_MS;
}
