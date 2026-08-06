import { z } from "zod";

import {
  ENGINE_INTAKE_PRIORITIES,
  ENGINE_INTAKE_SOURCES,
  INTAKE_PHOTO_CATEGORIES,
  type EngineIntakeCommand,
  type FinalizeIntakePhotoRequest,
  type PrepareIntakePhotoRequest,
} from "@autocore/engine-intake";

const identifier = z.string().trim().min(1).max(160);
const optionalIdentifier = identifier.nullish();
const shortText = z.string().trim().max(240);
const note = z.string().trim().max(2_000);
const client = z.enum(["desktop", "mobile", "server"]);
const idempotencyKey = z.string().trim().min(8).max(200);
const deviceId = z.string().trim().min(1).max(200);

const identity = z
  .object({
    serialCode: shortText.optional(),
    brandName: shortText.optional(),
    engineCode: shortText.optional(),
    donorVin: z.string().trim().max(32).optional(),
    configuration: z.string().trim().max(500).optional(),
  })
  .strict();

const commandBase = {
  idempotencyKey,
  client,
  deviceId: deviceId.optional(),
  clientAt: z.iso.datetime().optional(),
};

const jobCommandBase = {
  jobId: identifier,
};

const engineIntakeCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...commandBase,
      type: z.literal("create_job"),
      payload: z
        .object({
          jobId: identifier.optional(),
          source: z.enum(ENGINE_INTAKE_SOURCES),
          sourceReference: shortText.optional(),
          priority: z.enum(ENGINE_INTAKE_PRIORITIES).optional(),
          expectedIdentity: identity.optional(),
          assigneeUid: optionalIdentifier,
          assigneeName: shortText.nullish(),
          photoPackageTemplateId: optionalIdentifier,
          targetLocationId: optionalIdentifier,
          targetLocationCode: shortText.nullish(),
          dueAt: z.iso.datetime().nullish(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("claim_job"),
      deviceId,
      payload: z
        .object({
          ...jobCommandBase,
          sessionId: identifier.optional(),
          deviceName: shortText.nullish(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("merge_session"),
      payload: z
        .object({
          ...jobCommandBase,
          sourceSessionId: identifier,
          targetSessionId: identifier,
          reason: note.optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("archive_session"),
      payload: z
        .object({
          ...jobCommandBase,
          sessionId: identifier,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.enum([
        "heartbeat_session",
        "pause_session",
        "resume_session",
        "cancel_session",
      ]),
      deviceId,
      payload: z
        .object({
          ...jobCommandBase,
          sessionId: identifier,
          reason: note.optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("confirm_identity"),
      deviceId,
      payload: z
        .object({
          ...jobCommandBase,
          sessionId: identifier,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("report_identity_mismatch"),
      deviceId,
      payload: z
        .object({
          ...jobCommandBase,
          sessionId: identifier,
          reason: z.string().trim().min(1).max(500),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("set_location"),
      deviceId,
      payload: z
        .object({
          ...jobCommandBase,
          sessionId: identifier,
          locationId: identifier,
          code: z.string().trim().min(1).max(100),
          warehouseId: identifier.optional(),
          isStaging: z.boolean().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("field_complete"),
      deviceId,
      payload: z
        .object({
          ...jobCommandBase,
          sessionId: identifier,
          overrideReason: note.optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("update_identity"),
      payload: z
        .object({
          ...jobCommandBase,
          identity,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("reassign_job"),
      payload: z
        .object({
          ...jobCommandBase,
          assigneeUid: optionalIdentifier,
          assigneeName: shortText.nullish(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.enum(["release_claim", "pause_job", "resume_job", "cancel_job"]),
      payload: z
        .object({
          ...jobCommandBase,
          reason: note.optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.enum(["start_verification", "release_verification", "close_job"]),
      payload: z.object(jobCommandBase).strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("request_rework"),
      payload: z
        .object({
          ...jobCommandBase,
          note,
          gaps: z
            .array(
              z
                .object({
                  requirementId: identifier,
                  reason: z.string().trim().min(1).max(500),
                  photoId: identifier.optional(),
                })
                .strict(),
            )
            .min(1)
            .max(30),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("approve_job"),
      payload: z
        .object({
          ...jobCommandBase,
          note: note.optional(),
          identity: identity.optional(),
          aiOverrideReason: note.optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.enum(["quarantine_job", "reject_job"]),
      payload: z
        .object({
          ...jobCommandBase,
          reason: z.string().trim().min(1).max(2_000),
        })
        .strict(),
    })
    .strict(),
]);

const prepareIntakePhotoSchema = z
  .object({
    jobId: identifier,
    sessionId: identifier,
    idempotencyKey,
    deviceId,
    requirementId: optionalIdentifier,
    category: z.enum(INTAKE_PHOTO_CATEGORIES),
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1).max(100),
    sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
    capturedAt: z.iso.datetime(),
  })
  .strict();

const finalizeIntakePhotoSchema = z
  .object({
    jobId: identifier,
    sessionId: identifier,
    photoId: identifier,
    idempotencyKey,
    deviceId,
    storagePath: z.string().trim().min(1).max(1_000),
    downloadToken: identifier,
    contentType: z.string().trim().min(1).max(100),
    sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
    width: z.number().int().positive().max(20_000).nullish(),
    height: z.number().int().positive().max(20_000).nullish(),
  })
  .strict();

export function parseEngineIntakeCommand(value: unknown): EngineIntakeCommand {
  return engineIntakeCommandSchema.parse(value) as EngineIntakeCommand;
}

export function parsePrepareIntakePhotoRequest(value: unknown): PrepareIntakePhotoRequest {
  return prepareIntakePhotoSchema.parse(value) as PrepareIntakePhotoRequest;
}

export function parseFinalizeIntakePhotoRequest(value: unknown): FinalizeIntakePhotoRequest {
  return finalizeIntakePhotoSchema.parse(value) as FinalizeIntakePhotoRequest;
}
