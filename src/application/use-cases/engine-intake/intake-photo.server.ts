import "server-only";

import { createHash } from "node:crypto";

import {
  checklistHitsForCategory,
  canAcceptIntakePhotoUpload,
  deriveEngineIntakeProgress,
  type DocumentationChecklist,
  type EngineIntakeAssignment,
  type EngineIntakeIdentity,
  type EngineIntakeProgress,
  type FinalizeIntakePhotoRequest,
  type IntakePhotoCategory,
  type PhotoRequirement,
  type PrepareIntakePhotoRequest,
  type PrepareIntakePhotoResponse,
} from "@autocore/engine-intake";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type { VerifiedEngineIntakeAccess } from "@/lib/auth/verify-engine-intake-access.server";
import {
  assertIntakePhotoUpload,
  finalizeIntakePhotoUpload,
  prepareIntakePhotoUpload,
  readIntakePhotoStorageState,
} from "@/lib/engine-intake/intake-photo-storage.server";
import { resolvePhotoUploadResume } from "@/lib/engine-intake/resume-intake-photo-upload";
import { EngineIntakeCommandError } from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";

type PhotoJobDocument = {
  engineId: string;
  engineDocPath: string;
  state: string;
  requirements: PhotoRequirement[];
  progress: EngineIntakeProgress;
  documentationChecklist?: DocumentationChecklist | null;
  assignment: EngineIntakeAssignment;
  expectedIdentity?: EngineIntakeIdentity;
  identityConfirmation: Record<string, unknown> | null;
  activeReworkRequestId: string | null;
};

function splitDerivedProgress(
  derived: EngineIntakeProgress & { documentationChecklist: DocumentationChecklist },
) {
  const { documentationChecklist, ...progress } = derived;
  return { progress, documentationChecklist };
}

function photoIdFor(idempotencyKey: string): string {
  return createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 40);
}

function timestampFromIso(value: string): Timestamp {
  const parsed = new Date(value);
  return Timestamp.fromDate(Number.isFinite(parsed.getTime()) ? parsed : new Date());
}

function assertActivePhotoSession(
  job: PhotoJobDocument,
  session: Record<string, unknown> | undefined,
  access: VerifiedEngineIntakeAccess,
  sessionId: string,
  deviceId: string,
): void {
  if (!session) {
    throw new EngineIntakeCommandError("Engine intake session was not found", 404);
  }
  // Ownership is checked on the *session*, not on the live claim. The bytes were
  // shot by this person on this device inside this session; that is what earns
  // them a place on the engine, and it stays true however the bay has moved on
  // since. Requiring a live claim here is what pushed the phone into reclaiming
  // finished jobs — see `canAcceptIntakePhotoUpload`.
  if (session.userId !== access.uid) {
    throw new EngineIntakeCommandError("This session belongs to another worker", 403);
  }
  if (session.deviceId !== deviceId) {
    throw new EngineIntakeCommandError("This session is active on another device");
  }
  if (
    !canAcceptIntakePhotoUpload({
      sessionState: String(session.state ?? ""),
      jobState: String(job.state ?? ""),
    })
  ) {
    throw new EngineIntakeCommandError(
      "This engine is no longer open for photos",
    );
  }
  // Capture-first: serial is committed at create; free photos do not need a
  // separate physical-identity confirm gate.
}

function requirementFor(
  job: PhotoJobDocument,
  requirementId: string | null,
): PhotoRequirement | null {
  if (!requirementId) return null;
  const requirement = (job.requirements ?? []).find((item) => item.id === requirementId);
  if (!requirement) {
    throw new EngineIntakeCommandError("Photo requirement was not found", 400);
  }
  return requirement;
}

function progressPhoto(
  id: string,
  data: Record<string, unknown>,
): {
  id: string;
  deletedAt: string | null;
  syncState: "dirty" | "queued" | "syncing" | "synced" | "failed";
  url: string | null;
  reviewDecision: "accepted" | "rejected" | "retake_requested" | null;
  requirementId: string | null;
  category: IntakePhotoCategory;
  checklistHits?: DocumentationChecklist["items"][number]["id"][];
  hitConfidence?: number;
} {
  const syncState = ["dirty", "queued", "syncing", "synced", "failed"].includes(
    String(data.syncState),
  )
    ? (String(data.syncState) as
        | "dirty"
        | "queued"
        | "syncing"
        | "synced"
        | "failed")
    : "queued";
  const decision = ["accepted", "rejected", "retake_requested"].includes(
    String(data.reviewDecision),
  )
    ? (String(data.reviewDecision) as
        | "accepted"
        | "rejected"
        | "retake_requested")
    : null;
  return {
    id,
    deletedAt: data.deletedAt == null ? null : "deleted",
    syncState,
    url: typeof data.url === "string" ? data.url : null,
    reviewDecision: decision,
    requirementId:
      typeof data.requirementId === "string" ? data.requirementId : null,
    category: (typeof data.category === "string"
      ? data.category
      : "other") as IntakePhotoCategory,
    checklistHits: Array.isArray(data.checklistHits)
      ? (data.checklistHits as DocumentationChecklist["items"][number]["id"][])
      : undefined,
    hitConfidence:
      typeof data.hitConfidence === "number" ? data.hitConfidence : undefined,
  };
}

export async function prepareIntakePhoto(
  access: VerifiedEngineIntakeAccess,
  input: PrepareIntakePhotoRequest,
): Promise<PrepareIntakePhotoResponse> {
  const db = getAdminFirestore();
  const validation = assertIntakePhotoUpload({
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
  const jobRef = db
    .collection("companies")
    .doc(access.companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId);
  const sessionRef = jobRef.collection("sessions").doc(input.sessionId);
  const photoId = photoIdFor(input.idempotencyKey);
  const photoRef = jobRef.collection("photos").doc(photoId);

  const preparedState = await db.runTransaction(async (transaction) => {
    const [jobSnapshot, sessionSnapshot, photoSnapshot, photosSnapshot] =
      await Promise.all([
      transaction.get(jobRef),
      transaction.get(sessionRef),
      transaction.get(photoRef),
        transaction.get(jobRef.collection("photos")),
      ]);
    if (!jobSnapshot.exists) {
      throw new EngineIntakeCommandError("Engine intake job was not found", 404);
    }
    const job = jobSnapshot.data() as PhotoJobDocument;
    if (photoSnapshot.exists) {
      const existing = photoSnapshot.data() as Record<string, unknown>;
      if (
        existing.capturedByUid !== access.uid ||
        existing.capturedOnDeviceId !== input.deviceId ||
        existing.sessionId !== input.sessionId
      ) {
        throw new EngineIntakeCommandError(
          "Photo idempotency key belongs to another capture",
          409,
        );
      }
      return {
        exists: true,
        synced: existing.syncState === "synced" && typeof existing.url === "string",
        storagePath:
          typeof existing.storagePath === "string" ? existing.storagePath : null,
        downloadToken:
          typeof existing.downloadToken === "string" ? existing.downloadToken : null,
        url: typeof existing.url === "string" ? existing.url : null,
        contentType:
          typeof existing.contentType === "string"
            ? existing.contentType
            : validation.contentType,
      };
    }
    assertActivePhotoSession(
      job,
      sessionSnapshot.data(),
      access,
      input.sessionId,
      input.deviceId,
    );

    const requirement = requirementFor(job, input.requirementId);
    const storedPhotos = photosSnapshot.docs.map((photo) =>
      progressPhoto(photo.id, photo.data() as Record<string, unknown>),
    );
    const previousProgress = deriveEngineIntakeProgress(
      job.requirements ?? [],
      storedPhotos,
      {
        serialConfirmed: Boolean(
          (job.expectedIdentity as { serialCode?: string } | undefined)?.serialCode?.trim(),
        ),
      },
    );
    const reworkRef = job.activeReworkRequestId
      ? jobRef.collection("reworkRequests").doc(job.activeReworkRequestId)
      : null;
    const reworkSnapshot = reworkRef
      ? await transaction.get(reworkRef)
      : null;
    const reworkGaps = Array.isArray(reworkSnapshot?.data()?.gaps)
      ? (reworkSnapshot?.data()?.gaps as Array<{
          requirementId?: string;
          photoId?: string;
        }>)
      : [];
    const resolvedRequirementIds = new Set(
      Array.isArray(reworkSnapshot?.data()?.resolvedRequirementIds)
        ? (reworkSnapshot?.data()?.resolvedRequirementIds as string[])
        : [],
    );
    const resolvesReworkRequirement = Boolean(
      input.requirementId &&
        reworkGaps.some(
          (gap) =>
            gap.requirementId === input.requirementId &&
            !resolvedRequirementIds.has(input.requirementId!),
        ),
    );
    const replacedPhotoIds = new Set(
      resolvesReworkRequirement
        ? reworkGaps
            .filter((gap) => gap.requirementId === input.requirementId)
            .flatMap((gap) => (gap.photoId ? [gap.photoId] : []))
        : [],
    );
    if (resolvesReworkRequirement && input.requirementId) {
      resolvedRequirementIds.add(input.requirementId);
    }
    const projectedPhotos = storedPhotos.map((photo) =>
      replacedPhotoIds.has(photo.id) ? { ...photo, deletedAt: "replaced" } : photo,
    );
    let derived = deriveEngineIntakeProgress(
      job.requirements ?? [],
      [
        ...projectedPhotos,
        {
          id: photoId,
          deletedAt: null,
          syncState: "queued",
          url: null,
          reviewDecision: null,
          requirementId: input.requirementId,
          category: input.category as IntakePhotoCategory,
        },
      ],
      {
        serialConfirmed: Boolean(
          (job.expectedIdentity as { serialCode?: string } | undefined)?.serialCode?.trim(),
        ),
        previousChecklist: job.documentationChecklist ?? null,
      },
    );
    if (reworkRef && reworkSnapshot?.exists) {
      const unresolvedReworkRequirementIds = reworkGaps
        .map((gap) => gap.requirementId)
        .filter(
          (requirementId): requirementId is string =>
            Boolean(requirementId) && !resolvedRequirementIds.has(requirementId!),
        );
      derived = {
        ...derived,
        missingRequirementIds: Array.from(
          new Set([
            ...derived.missingRequirementIds,
            ...unresolvedReworkRequirementIds,
          ]),
        ),
      };
    }
    const { progress: nextProgress, documentationChecklist } = splitDerivedProgress(derived);

    transaction.create(photoRef, {
      companyId: access.companyId,
      jobId: input.jobId,
      engineId: job.engineId,
      sessionId: input.sessionId,
      requirementId: input.requirementId,
      category: input.category,
      categorySource: "worker",
      localUri: null,
      storagePath: null,
      url: null,
      contentType: validation.contentType,
      sizeBytes: input.sizeBytes,
      width: null,
      height: null,
      capturedByUid: access.uid,
      capturedOnDeviceId: input.deviceId,
      capturedAt: timestampFromIso(input.capturedAt),
      uploadedAt: null,
      syncState: "queued",
      reviewDecision: null,
      aiInspectionState: "none",
      idempotencyKey: input.idempotencyKey,
      deletedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(jobRef, {
      progress: nextProgress,
      documentationChecklist,
      updatedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
    });
    for (const replacedPhotoId of replacedPhotoIds) {
      transaction.update(jobRef.collection("photos").doc(replacedPhotoId), {
        deletedAt: FieldValue.serverTimestamp(),
        replacedByPhotoId: photoId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    if (reworkRef && reworkSnapshot?.exists && resolvesReworkRequirement) {
      transaction.update(reworkRef, {
        resolvedRequirementIds: Array.from(resolvedRequirementIds),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.create(jobRef.collection("events").doc(`${photoId}-captured`), {
      companyId: access.companyId,
      jobId: input.jobId,
      engineId: job.engineId,
      sessionId: input.sessionId,
      actorId: access.uid,
      actorName: access.actorName,
      actorRole: access.actorRole,
      deviceId: input.deviceId,
      client: "mobile",
      type: "photo.captured",
      payload: {
        photoId,
        requirementId: input.requirementId,
        category: input.category,
      },
      clientAt: timestampFromIso(input.capturedAt),
      serverAt: FieldValue.serverTimestamp(),
      idempotencyKey: input.idempotencyKey,
    });
    if (
      requirement &&
      (previousProgress.missingRequirementIds.includes(requirement.id) ||
        job.progress.missingRequirementIds.includes(requirement.id)) &&
      !nextProgress.missingRequirementIds.includes(requirement.id)
    ) {
      transaction.create(
        jobRef.collection("events").doc(`${photoId}-requirement-satisfied`),
        {
          companyId: access.companyId,
          jobId: input.jobId,
          engineId: job.engineId,
          sessionId: input.sessionId,
          actorId: access.uid,
          actorName: access.actorName,
          actorRole: access.actorRole,
          deviceId: input.deviceId,
          client: "mobile",
          type: "requirement.satisfied",
          payload: {
            photoId,
            requirementId: requirement.id,
          },
          clientAt: timestampFromIso(input.capturedAt),
          serverAt: FieldValue.serverTimestamp(),
          idempotencyKey: `${input.idempotencyKey}:requirement`,
        },
      );
    }
    return {
      exists: false,
      synced: false,
      storagePath: null,
      downloadToken: null,
      url: null,
      contentType: validation.contentType,
    };
  });

  if (preparedState.synced && preparedState.storagePath && preparedState.url) {
    return {
      photoId,
      uploadUrl: "",
      storagePath: preparedState.storagePath,
      // The stored token, never "".
      //
      // This one empty string was a permanent, silent data-loss trap. `prepare`
      // reports `alreadyUploaded` exactly when a previous attempt finalized and
      // the device never heard the answer — the app was killed, or the reply
      // was lost. The client then finalizes again to learn the URL, and
      // `finalizeIntakePhotoSchema` requires a non-empty `downloadToken`, so
      // that call came back 400 "Invalid intake photo finalization": a
      // non-retryable code for a photo that was already safely in Storage. The
      // worker saw a red card over an engine they had documented correctly, and
      // no amount of retrying could ever clear it.
      downloadToken: preparedState.downloadToken ?? "",
      url: preparedState.url,
      contentType: preparedState.contentType,
      alreadyUploaded: true,
      alreadyFinalized: true,
    };
  }

  // A previous attempt may already have put the bytes in the bucket and died
  // before finalize — the PUT runs on the iOS background URLSession and
  // outlives the app, finalize does not. Re-sending a file the bucket already
  // holds costs the worker a second upload over cellular for nothing.
  if (preparedState.storagePath && preparedState.downloadToken) {
    const storage = await readIntakePhotoStorageState(
      preparedState.storagePath,
      preparedState.downloadToken,
    );
    const resume = resolvePhotoUploadResume({ storage, expectedBytes: input.sizeBytes });
    if (resume.action === "finalize") {
      return {
        photoId,
        uploadUrl: "",
        storagePath: preparedState.storagePath,
        downloadToken: preparedState.downloadToken,
        url: preparedState.url ?? storage.url,
        contentType: preparedState.contentType,
        alreadyUploaded: true,
      };
    }
  }

  const prepared = await prepareIntakePhotoUpload({
    companyId: access.companyId,
    jobId: input.jobId,
    photoId,
    contentType: validation.contentType,
    extension: validation.extension,
    ...(preparedState.storagePath ? { storagePath: preparedState.storagePath } : {}),
  });
  await photoRef.set(
    {
      storagePath: prepared.storagePath,
      downloadToken: prepared.downloadToken,
      syncState: "syncing",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    photoId,
    uploadUrl: prepared.uploadUrl,
    storagePath: prepared.storagePath,
    downloadToken: prepared.downloadToken,
    url: prepared.url,
    contentType: validation.contentType,
  };
}

type FinalizationActor = {
  id: string;
  name: string | null;
  role: string | null;
  deviceId: string;
  client: "mobile" | "server";
};

/**
 * Close a photo out: mark the row synced, recompute the job, record the event.
 *
 * Shared by the device's `finalize` call and by the Storage trigger that
 * finalizes a photo whose bytes arrived after the app was gone. Both must
 * produce byte-identical state, or a worker who left the app would end up with
 * a job whose progress disagreed with its own photos.
 */
async function commitIntakePhotoFinalization(input: {
  companyId: string;
  jobId: string;
  sessionId: string;
  photoId: string;
  storagePath: string;
  downloadToken: string;
  contentType: string;
  url: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  actor: FinalizationActor;
  idempotencyKey: string;
}): Promise<void> {
  const db = getAdminFirestore();
  const jobRef = db
    .collection("companies")
    .doc(input.companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId);
  const photoRef = jobRef.collection("photos").doc(input.photoId);

  await db.runTransaction(async (transaction) => {
    const [freshJobSnapshot, freshPhotoSnapshot, photosSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(photoRef),
      transaction.get(jobRef.collection("photos")),
    ]);
    if (!freshJobSnapshot.exists || !freshPhotoSnapshot.exists) {
      throw new EngineIntakeCommandError("Intake photo was removed during upload", 409);
    }
    const freshPhoto = freshPhotoSnapshot.data() as Record<string, unknown>;
    // Whoever got here first already did all of this. Returning rather than
    // rewriting is what makes the trigger safe to fire twice and safe to race
    // the device.
    if (freshPhoto.url && freshPhoto.syncState === "synced") return;
    if (
      freshPhoto.storagePath !== input.storagePath ||
      freshPhoto.downloadToken !== input.downloadToken
    ) {
      throw new EngineIntakeCommandError(
        "Prepared photo upload changed before finalization",
        409,
      );
    }
    const freshJob = freshJobSnapshot.data() as PhotoJobDocument;
    const derived = deriveEngineIntakeProgress(
      freshJob.requirements ?? [],
      photosSnapshot.docs.map((candidate) => {
        const data = candidate.data() as Record<string, unknown>;
        return candidate.id === input.photoId
          ? progressPhoto(candidate.id, {
              ...data,
              storagePath: input.storagePath,
              url: input.url,
              syncState: "synced",
            })
          : progressPhoto(candidate.id, data);
      }),
      {
        serialConfirmed: Boolean(
          (freshJob.expectedIdentity as { serialCode?: string } | undefined)?.serialCode?.trim(),
        ),
        previousChecklist: freshJob.documentationChecklist ?? null,
      },
    );
    const { progress, documentationChecklist } = splitDerivedProgress(derived);

    transaction.update(photoRef, {
      storagePath: input.storagePath,
      url: input.url,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      uploadedAt: FieldValue.serverTimestamp(),
      syncState: "synced",
      aiInspectionState: "none",
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(jobRef, {
      progress,
      documentationChecklist,
      updatedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
    });
    if (
      freshJob.engineDocPath?.startsWith("users/") &&
      freshJob.engineDocPath.includes("/motors/")
    ) {
      transaction.update(db.doc(freshJob.engineDocPath), {
        photoUrls: FieldValue.arrayUnion(input.url),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.create(jobRef.collection("events").doc(`${input.photoId}-uploaded`), {
      companyId: input.companyId,
      jobId: input.jobId,
      engineId: freshJob.engineId,
      sessionId: input.sessionId,
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      deviceId: input.actor.deviceId,
      client: input.actor.client,
      type: "photo.uploaded",
      payload: {
        photoId: input.photoId,
        storagePath: input.storagePath,
      },
      clientAt: FieldValue.serverTimestamp(),
      serverAt: FieldValue.serverTimestamp(),
      idempotencyKey: input.idempotencyKey,
    });
  });
}

/**
 * Finish a photo the moment its bytes land in Storage, with no client involved.
 *
 * This is what makes leaving the app safe. The PUT runs on the iOS background
 * URLSession and survives a suspend or a kill; `finalize` is an ordinary
 * request from the JS runtime and does not. Before this, a photo whose bytes
 * arrived after the app was gone stayed `syncing` in Firestore until the worker
 * happened to open the app again — the object was in the bucket, and the
 * business still could not see the engine.
 *
 * Everything it needs was already written by `prepare`, so there is nothing to
 * trust from the caller beyond which object landed.
 */
export async function autoFinalizeIntakePhotoFromStorage(input: {
  companyId: string;
  jobId: string;
  photoId: string;
}): Promise<{ status: "finalized" | "already_finalized" | "not_ready" }> {
  const db = getAdminFirestore();
  const companyId = input.companyId.trim();
  const jobRef = db
    .collection("companies")
    .doc(companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId);
  const photoRef = jobRef.collection("photos").doc(input.photoId);
  const photoSnapshot = await photoRef.get();
  if (!photoSnapshot.exists) return { status: "not_ready" };

  const photo = photoSnapshot.data() as Record<string, unknown>;
  if (photo.url && photo.syncState === "synced") return { status: "already_finalized" };
  if (photo.deletedAt) return { status: "already_finalized" };

  const storagePath = typeof photo.storagePath === "string" ? photo.storagePath : "";
  const downloadToken = typeof photo.downloadToken === "string" ? photo.downloadToken : "";
  const contentType = typeof photo.contentType === "string" ? photo.contentType : "";
  // `prepare` writes all three before it answers the device, so a gap here means
  // the object arrived for a row that is not ready to be closed — leave it to
  // the client, which still has the credentials.
  if (!storagePath || !downloadToken || !contentType) return { status: "not_ready" };

  const claimedBytes = Number(photo.sizeBytes);
  const validation = assertIntakePhotoUpload({
    contentType,
    sizeBytes: Number.isFinite(claimedBytes) && claimedBytes > 0 ? claimedBytes : 1,
  });

  const finalized = await finalizeIntakePhotoUpload({
    companyId,
    jobId: input.jobId,
    photoId: input.photoId,
    storagePath,
    downloadToken,
    contentType: validation.contentType,
  });

  await commitIntakePhotoFinalization({
    companyId,
    jobId: input.jobId,
    sessionId: typeof photo.sessionId === "string" ? photo.sessionId : "",
    photoId: input.photoId,
    storagePath,
    downloadToken,
    contentType: validation.contentType,
    url: finalized.url,
    sizeBytes: finalized.sizeBytes,
    width: typeof photo.width === "number" ? photo.width : null,
    height: typeof photo.height === "number" ? photo.height : null,
    actor: {
      id: typeof photo.capturedByUid === "string" ? photo.capturedByUid : "",
      name: null,
      role: null,
      deviceId: typeof photo.capturedOnDeviceId === "string" ? photo.capturedOnDeviceId : "",
      client: "server",
    },
    idempotencyKey: `${input.photoId}:storage-finalize`,
  });

  return { status: "finalized" };
}

export async function finalizeIntakePhoto(
  access: VerifiedEngineIntakeAccess,
  input: FinalizeIntakePhotoRequest,
): Promise<{ photoId: string; url: string; aiInspectionId: string }> {
  const db = getAdminFirestore();
  const validation = assertIntakePhotoUpload({
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
  const jobRef = db
    .collection("companies")
    .doc(access.companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId);
  const sessionRef = jobRef.collection("sessions").doc(input.sessionId);
  const photoRef = jobRef.collection("photos").doc(input.photoId);
  const [jobSnapshot, sessionSnapshot, photoSnapshot] = await Promise.all([
    jobRef.get(),
    sessionRef.get(),
    photoRef.get(),
  ]);
  if (!jobSnapshot.exists || !photoSnapshot.exists) {
    throw new EngineIntakeCommandError("Intake photo was not found", 404);
  }
  const session = sessionSnapshot.data();
  if (!session || session.userId !== access.uid || session.deviceId !== input.deviceId) {
    throw new EngineIntakeCommandError("Photo session ownership changed", 403);
  }
  const photo = photoSnapshot.data() as Record<string, unknown>;
  if (photo.capturedByUid !== access.uid) {
    throw new EngineIntakeCommandError("Photo belongs to another worker", 403);
  }
  if (photo.url && photo.syncState === "synced") {
    // Refresh checklist mapping for already-synced photos (capture-first rules).
    try {
      await db.runTransaction(async (transaction) => {
        const [freshJobSnapshot, photosSnapshot] = await Promise.all([
          transaction.get(jobRef),
          transaction.get(jobRef.collection("photos")),
        ]);
        if (!freshJobSnapshot.exists) return;
        const freshJob = freshJobSnapshot.data() as PhotoJobDocument;
        const derived = deriveEngineIntakeProgress(
          freshJob.requirements ?? [],
          photosSnapshot.docs.map((candidate) =>
            progressPhoto(candidate.id, candidate.data() as Record<string, unknown>),
          ),
          {
            serialConfirmed: Boolean(
              (freshJob.expectedIdentity as { serialCode?: string } | undefined)?.serialCode?.trim(),
            ),
            previousChecklist: freshJob.documentationChecklist ?? null,
          },
        );
        const { progress, documentationChecklist } = splitDerivedProgress(derived);
        transaction.update(jobRef, {
          progress,
          documentationChecklist: {
            ...documentationChecklist,
            understandingState:
              documentationChecklist.summary.saleGateMissingCount === 0
                ? "ready"
                : "understanding",
          },
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("[engine-intake/finalize] checklist refresh", error);
    }
    return {
      photoId: input.photoId,
      url: String(photo.url),
      aiInspectionId: `${input.photoId}-latest`,
    };
  }
  if (
    photo.storagePath !== input.storagePath ||
    photo.downloadToken !== input.downloadToken
  ) {
    throw new EngineIntakeCommandError(
      "Photo upload does not match the prepared storage object",
      409,
    );
  }
  if (photo.contentType !== validation.contentType) {
    throw new EngineIntakeCommandError("Photo content type changed during upload", 409);
  }

  const finalized = await finalizeIntakePhotoUpload({
    companyId: access.companyId,
    jobId: input.jobId,
    photoId: input.photoId,
    storagePath: input.storagePath,
    downloadToken: input.downloadToken,
    contentType: validation.contentType,
  });
  // Trust the object in Storage. RN `File.size` and GCS metadata can disagree
  // after a background URLSession PUT or a retried upload; an empty/oversize
  // object is already rejected inside `finalizeIntakePhotoUpload`.
  if (finalized.sizeBytes !== input.sizeBytes) {
    console.warn("[engine-intake/finalize] size mismatch", {
      stored: finalized.sizeBytes,
      claimed: input.sizeBytes,
      photoId: input.photoId,
    });
  }
  const aiInspectionId = `${input.photoId}-latest`;

  await commitIntakePhotoFinalization({
    companyId: access.companyId,
    jobId: input.jobId,
    sessionId: input.sessionId,
    photoId: input.photoId,
    storagePath: input.storagePath,
    downloadToken: input.downloadToken,
    contentType: validation.contentType,
    url: finalized.url,
    sizeBytes: finalized.sizeBytes,
    width: input.width ?? null,
    height: input.height ?? null,
    actor: {
      id: access.uid,
      name: access.actorName,
      role: access.actorRole,
      deviceId: input.deviceId,
      client: "mobile",
    },
    idempotencyKey: input.idempotencyKey,
  });

  return { photoId: input.photoId, url: finalized.url, aiInspectionId };
}

export async function setIntakePhotoCategory(
  access: VerifiedEngineIntakeAccess,
  input: {
    jobId: string;
    photoId: string;
    category: IntakePhotoCategory;
    aiLabel?: string | null;
  },
): Promise<{ photoId: string; category: IntakePhotoCategory }> {
  const db = getAdminFirestore();
  const jobRef = db
    .collection("companies")
    .doc(access.companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId);
  const photoRef = jobRef.collection("photos").doc(input.photoId);
  const [jobSnapshot, photoSnapshot] = await Promise.all([jobRef.get(), photoRef.get()]);
  if (!jobSnapshot.exists || !photoSnapshot.exists) {
    throw new EngineIntakeCommandError("Intake photo was not found", 404);
  }

  const label = input.aiLabel?.trim() || null;
  const hits = [...checklistHitsForCategory(input.category)];
  const hitConfidence = hits.length > 0 ? 0.9 : 0;

  await db.runTransaction(async (transaction) => {
    const [freshJobSnapshot, photosSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(jobRef.collection("photos")),
    ]);
    if (!freshJobSnapshot.exists) {
      throw new EngineIntakeCommandError("Intake job was not found", 404);
    }
    const freshJob = freshJobSnapshot.data() as PhotoJobDocument;
    transaction.update(photoRef, {
      category: input.category,
      categorySource: "system",
      aiLabel: label,
      checklistHits: hits,
      hitConfidence,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const derived = deriveEngineIntakeProgress(
      freshJob.requirements ?? [],
      photosSnapshot.docs.map((candidate) => {
        const data = candidate.data() as Record<string, unknown>;
        return candidate.id === input.photoId
          ? progressPhoto(candidate.id, {
              ...data,
              category: input.category,
              checklistHits: hits,
              hitConfidence,
            })
          : progressPhoto(candidate.id, data);
      }),
      {
        serialConfirmed: Boolean(
          (freshJob.expectedIdentity as { serialCode?: string } | undefined)?.serialCode?.trim(),
        ),
        previousChecklist: freshJob.documentationChecklist ?? null,
      },
    );
    const { progress, documentationChecklist } = splitDerivedProgress(derived);
    transaction.update(jobRef, {
      progress,
      documentationChecklist: {
        ...documentationChecklist,
        understandingState:
          documentationChecklist.summary.saleGateMissingCount === 0
            ? "ready"
            : "understanding",
      },
      updatedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
    });
  });

  return { photoId: input.photoId, category: input.category };
}
