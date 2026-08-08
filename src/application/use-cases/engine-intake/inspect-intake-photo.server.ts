import "server-only";

import {
  DOCUMENTATION_CHECKLIST_ITEM_IDS,
  INTAKE_PHOTO_CATEGORIES,
  checklistHitsForCategory,
  deriveEngineIntakeProgress,
  type DocumentationChecklist,
  type DocumentationChecklistItemId,
  type IntakePhotoCategory,
} from "@autocore/engine-intake";
import {
  FieldValue,
  type DocumentReference,
  type QuerySnapshot,
} from "firebase-admin/firestore";
import { z } from "zod";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  callOpenRouterJson,
  resolveOpenRouterModel,
} from "@/infrastructure/openrouter/chat-completions.server";
import { prepareVisionImageDataUrl } from "@/infrastructure/openrouter/prepare-vision-image.server";
import { downloadIntakePhotoBuffer } from "@/lib/engine-intake/intake-photo-storage.server";

function asIntakePhotoCategory(value: unknown): IntakePhotoCategory {
  return INTAKE_PHOTO_CATEGORIES.includes(value as IntakePhotoCategory)
    ? (value as IntakePhotoCategory)
    : "other";
}

const CHECKLIST_ITEM_ID_SET = new Set<string>(DOCUMENTATION_CHECKLIST_ITEM_IDS);

function sanitizeChecklistHits(value: unknown): DocumentationChecklistItemId[] {
  if (!Array.isArray(value)) return [];
  const out: DocumentationChecklistItemId[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    if (!CHECKLIST_ITEM_ID_SET.has(entry)) continue;
    if (out.includes(entry as DocumentationChecklistItemId)) continue;
    out.push(entry as DocumentationChecklistItemId);
    if (out.length >= 12) break;
  }
  return out;
}

const aiFlagCode = z.enum([
  "blur",
  "underexposed",
  "glare",
  "incomplete_frame",
  "wrong_category",
  "irrelevant",
  "watermark",
  "duplicate_engine",
  "mixed_engine_set",
  "damage",
  "missing_component",
  "exif_anomaly",
]);

const inspectionSchema = z
  .object({
    suggestedCategory: z
      .union([z.enum(INTAKE_PHOTO_CATEGORIES), z.string(), z.null()])
      .optional()
      .nullable()
      .transform((value) => {
        if (value == null) return null;
        return INTAKE_PHOTO_CATEGORIES.includes(value as IntakePhotoCategory)
          ? (value as IntakePhotoCategory)
          : null;
      }),
    suggestedIdentity: z
      .object({
        serialCode: z.string().max(240).optional(),
        brandName: z.string().max(240).optional(),
        engineCode: z.string().max(240).optional(),
        donorVin: z.string().max(32).optional(),
        configuration: z.string().max(500).optional(),
      })
      .passthrough()
      .optional()
      .default({}),
    checklistHits: z
      .array(z.union([z.string(), z.number()]))
      .max(24)
      .optional()
      .default([])
      .transform((value) => sanitizeChecklistHits(value)),
    hitConfidence: z.number().min(0).max(1).nullable().optional().default(null),
    hasTurbo: z.boolean().nullable().optional().default(null),
    oilPanRemoved: z.boolean().nullable().optional().default(null),
    cylinderCount: z.number().int().min(3).max(8).nullable().optional().default(null),
    flags: z
      .array(
        z
          .object({
            code: z.union([aiFlagCode, z.string()]).transform((code) =>
              aiFlagCode.safeParse(code).success ? code : "irrelevant",
            ),
            severity: z
              .enum(["info", "warning", "blocking"])
              .catch("warning"),
            confidence: z.number().min(0).max(1).catch(0.5),
            message: z.string().min(1).max(400).catch("Quality issue"),
          })
          .passthrough(),
      )
      .max(20)
      .optional()
      .default([]),
    listingReadinessScore: z.number().min(0).max(100).nullable().optional().default(null),
  })
  .passthrough();

type PhotoJobDocument = {
  engineId?: string;
  expectedIdentity?: { serialCode?: string };
  requirements?: unknown[];
  documentationChecklist?: DocumentationChecklist | null;
  blockingAiFlags?: Array<{ photoId?: string }>;
};

function progressPhotosFromSnapshot(
  photosSnapshot: QuerySnapshot,
  patch?: {
    photoId: string;
    category: IntakePhotoCategory;
    checklistHits: DocumentationChecklistItemId[];
    hitConfidence: number;
  },
) {
  return photosSnapshot.docs.map((doc) => {
    const data = doc.data();
    const isPatched = patch && doc.id === patch.photoId;
    return {
      id: doc.id,
      deletedAt: data.deletedAt ?? null,
      syncState: data.syncState ?? "queued",
      url: typeof data.url === "string" ? data.url : null,
      reviewDecision: data.reviewDecision ?? null,
      requirementId: typeof data.requirementId === "string" ? data.requirementId : null,
      category: isPatched ? patch.category : asIntakePhotoCategory(data.category),
      checklistHits: isPatched
        ? patch.checklistHits
        : Array.isArray(data.checklistHits)
          ? sanitizeChecklistHits(data.checklistHits)
          : undefined,
      hitConfidence: isPatched
        ? patch.hitConfidence
        : typeof data.hitConfidence === "number"
          ? data.hitConfidence
          : undefined,
    };
  });
}

async function reconcileJobChecklist(input: {
  jobRef: DocumentReference;
  companyId: string;
  jobId: string;
  photoId: string;
  actorUid: string;
  patch?: {
    category: IntakePhotoCategory;
    checklistHits: DocumentationChecklistItemId[];
    hitConfidence: number;
  };
  hints?: {
    hasTurbo?: boolean | null;
    cylinderCount?: number | null;
    oilPanRemoved?: boolean | null;
  };
}): Promise<DocumentationChecklist | null> {
  const db = getAdminFirestore();
  let nextChecklist: DocumentationChecklist | null = null;
  await db.runTransaction(async (transaction) => {
    const [freshJobSnapshot, photosSnapshot] = await Promise.all([
      transaction.get(input.jobRef),
      transaction.get(input.jobRef.collection("photos")),
    ]);
    if (!freshJobSnapshot.exists) return;
    const freshJob = freshJobSnapshot.data() as PhotoJobDocument;
    const expectedIdentity = freshJob.expectedIdentity;
    const derived = deriveEngineIntakeProgress(
      Array.isArray(freshJob.requirements) ? (freshJob.requirements as never[]) : [],
      progressPhotosFromSnapshot(
        photosSnapshot,
        input.patch
          ? {
              photoId: input.photoId,
              category: input.patch.category,
              checklistHits: input.patch.checklistHits,
              hitConfidence: input.patch.hitConfidence,
            }
          : undefined,
      ),
      {
        serialConfirmed: Boolean(expectedIdentity?.serialCode?.trim()),
        previousChecklist: freshJob.documentationChecklist ?? null,
        hasTurbo: input.hints?.hasTurbo,
        cylinderCount: input.hints?.cylinderCount,
        oilPanRemoved: input.hints?.oilPanRemoved,
      },
    );
    const { documentationChecklist, ...progressOnly } = derived;
    nextChecklist = documentationChecklist;
    transaction.update(input.jobRef, {
      progress: progressOnly,
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
  return nextChecklist;
}

export async function inspectEngineIntakePhoto(input: {
  companyId: string;
  jobId: string;
  photoId: string;
  actorUid: string;
}): Promise<void> {
  const db = getAdminFirestore();
  const jobRef = db
    .collection("companies")
    .doc(input.companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId);
  const photoRef = jobRef.collection("photos").doc(input.photoId);
  const inspectionRef = jobRef.collection("aiInspections").doc(`${input.photoId}-latest`);
  const [jobSnapshot, photoSnapshot] = await Promise.all([jobRef.get(), photoRef.get()]);
  if (!jobSnapshot.exists || !photoSnapshot.exists) return;

  const job = jobSnapshot.data() as Record<string, unknown>;
  const photo = photoSnapshot.data() as Record<string, unknown>;
  const storagePath = typeof photo.storagePath === "string" ? photo.storagePath : "";
  const url = typeof photo.url === "string" ? photo.url : "";
  if (!storagePath && !url) return;

  const model = resolveOpenRouterModel(undefined, "engineIntakeVision");
  await inspectionRef.set(
    {
      state: "processing",
      model,
      modelVersion: model,
      startedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await photoRef.set(
    {
      aiInspectionState: "processing",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Capture-first: apply category→checklist mapping before waiting on vision so
  // free `other` photos tick Overall engine even if OpenRouter is slow/down.
  await reconcileJobChecklist({
    jobRef,
    companyId: input.companyId,
    jobId: input.jobId,
    photoId: input.photoId,
    actorUid: input.actorUid,
  }).catch((error) => {
    console.error("[engine-intake/photo-ai] pre-reconcile", error);
  });

  try {
    const identity =
      typeof job.expectedIdentity === "object" && job.expectedIdentity
        ? JSON.stringify(job.expectedIdentity)
        : "{}";

    let visionUrl = url;
    if (storagePath) {
      const downloaded = await downloadIntakePhotoBuffer(storagePath);
      const prepared = await prepareVisionImageDataUrl(
        downloaded.buffer,
        downloaded.contentType,
      );
      visionUrl = prepared.dataUrl;
    }

    const result = await callOpenRouterJson(
      [
        {
          role: "system",
          content:
            "You inspect automotive engine documentation photos for a dismantler. Return only grounded observations. Prefer dismantler checklist vocabulary (serial, sides, valve cover, oil pan, turbo, cylinders, crankshaft). Blocking flags are for unusable or clearly wrong evidence only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Expected identity: ${identity}`,
                `Worker category hint: ${String(photo.category ?? "other")}`,
                "Return suggestedCategory, suggestedIdentity, checklistHits (from known item ids), hitConfidence, hasTurbo, oilPanRemoved, cylinderCount, flags, listingReadinessScore.",
                `Known checklist item ids: ${DOCUMENTATION_CHECKLIST_ITEM_IDS.join(", ")}`,
              ].join("\n"),
            },
            { type: "image_url", image_url: { url: visionUrl } },
          ],
        },
      ],
      inspectionSchema,
      {
        profile: "engineIntakeVision",
        title: "AutoCore Engine Intake",
        retries: 1,
      },
    );

    const blockingFlags = result.flags
      .filter((flag) => flag.severity === "blocking")
      .map((flag) => ({
        code: flag.code,
        severity: flag.severity,
        confidence: flag.confidence,
        message: flag.message,
        photoId: input.photoId,
      }));

    const checklistHits: DocumentationChecklistItemId[] =
      result.checklistHits.length > 0
        ? result.checklistHits
        : [
            ...checklistHitsForCategory(
              asIntakePhotoCategory(result.suggestedCategory ?? photo.category),
            ),
          ];
    const hitConfidence = result.hitConfidence ?? 0.75;
    const nextCategory = asIntakePhotoCategory(
      result.suggestedCategory && photo.category === "other"
        ? result.suggestedCategory
        : photo.category,
    );

    await db.runTransaction(async (transaction) => {
      const freshJobSnapshot = await transaction.get(jobRef);
      if (!freshJobSnapshot.exists) return;
      const freshJob = freshJobSnapshot.data() as PhotoJobDocument;
      const currentBlockingFlags = Array.isArray(freshJob.blockingAiFlags)
        ? freshJob.blockingAiFlags
        : [];
      const nextBlockingFlags = [
        ...currentBlockingFlags.filter((flag) => flag.photoId !== input.photoId),
        ...blockingFlags,
      ];
      transaction.set(
        inspectionRef,
        {
          companyId: input.companyId,
          jobId: input.jobId,
          engineId: String(job.engineId ?? ""),
          photoId: input.photoId,
          model,
          modelVersion: model,
          state: "completed",
          suggestedCategory: result.suggestedCategory,
          suggestedIdentity: result.suggestedIdentity,
          checklistHits,
          hitConfidence: result.hitConfidence,
          hasTurbo: result.hasTurbo,
          oilPanRemoved: result.oilPanRemoved,
          cylinderCount: result.cylinderCount,
          flags: result.flags,
          listingReadinessScore: result.listingReadinessScore,
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.update(photoRef, {
        aiInspectionState: "completed",
        checklistHits,
        hitConfidence,
        ...(result.suggestedCategory && photo.category === "other"
          ? {
              category: result.suggestedCategory,
              categorySource: "ai",
            }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const photosSnapshot = await transaction.get(jobRef.collection("photos"));
      const expectedIdentity = freshJob.expectedIdentity;
      const previousChecklist = freshJob.documentationChecklist ?? null;
      const derived = deriveEngineIntakeProgress(
        Array.isArray(freshJob.requirements) ? (freshJob.requirements as never[]) : [],
        progressPhotosFromSnapshot(photosSnapshot, {
          photoId: input.photoId,
          category: nextCategory,
          checklistHits,
          hitConfidence,
        }),
        {
          serialConfirmed: Boolean(expectedIdentity?.serialCode?.trim()),
          previousChecklist,
          hasTurbo: result.hasTurbo,
          cylinderCount: result.cylinderCount,
          oilPanRemoved: result.oilPanRemoved,
        },
      );
      const { documentationChecklist, ...progressOnly } = derived;
      transaction.update(jobRef, {
        blockingAiFlags: nextBlockingFlags,
        progress: progressOnly,
        documentationChecklist: {
          ...documentationChecklist,
          understandingState:
            documentationChecklist.summary.saleGateMissingCount === 0
              ? "ready"
              : "understanding",
        },
        ...(result.suggestedIdentity?.brandName || result.suggestedIdentity?.engineCode
          ? {
              expectedIdentity: {
                ...(typeof freshJob.expectedIdentity === "object"
                  ? freshJob.expectedIdentity
                  : {}),
                ...(result.suggestedIdentity.brandName
                  ? { brandName: result.suggestedIdentity.brandName }
                  : {}),
                ...(result.suggestedIdentity.engineCode
                  ? { engineCode: result.suggestedIdentity.engineCode }
                  : {}),
              },
            }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(
        jobRef.collection("events").doc(`ai-${input.photoId}`),
        {
          companyId: input.companyId,
          jobId: input.jobId,
          engineId: String(job.engineId ?? ""),
          sessionId: String(photo.sessionId ?? "") || null,
          actorId: "ai",
          actorName: "AutoCore AI",
          actorRole: "ai",
          deviceId: null,
          client: "ai",
          type: "ai.inspection_completed",
          payload: {
            photoId: input.photoId,
            suggestedCategory: result.suggestedCategory,
            checklistHits,
            flagCodes: result.flags.map((flag) => flag.code),
            listingReadinessScore: result.listingReadinessScore,
            whisper: documentationChecklist.summary.whisper,
          },
          clientAt: FieldValue.serverTimestamp(),
          serverAt: FieldValue.serverTimestamp(),
          idempotencyKey: `ai:${input.photoId}:${model}`,
        },
        { merge: true },
      );
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "AI inspection failed";
    console.error("[engine-intake/photo-ai]", input.photoId, message);
    await Promise.all([
      inspectionRef.set(
        {
          state: "failed",
          error: message,
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      photoRef.set(
        {
          aiInspectionState: "failed",
          // Ensure free-capture photos still contribute overall coverage when AI dies.
          checklistHits: checklistHitsForCategory(asIntakePhotoCategory(photo.category)),
          hitConfidence: 0.7,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      reconcileJobChecklist({
        jobRef,
        companyId: input.companyId,
        jobId: input.jobId,
        photoId: input.photoId,
        actorUid: input.actorUid,
        patch: {
          category: asIntakePhotoCategory(photo.category),
          checklistHits: [
            ...checklistHitsForCategory(asIntakePhotoCategory(photo.category)),
          ],
          hitConfidence: 0.7,
        },
      }).catch((reconcileError) => {
        console.error("[engine-intake/photo-ai] failure reconcile", reconcileError);
      }),
    ]);
  }
}
