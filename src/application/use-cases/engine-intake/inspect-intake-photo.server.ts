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
    brandConfidence: z.number().min(0).max(1).nullable().optional().default(null),
    engineCodeConfidence: z.number().min(0).max(1).nullable().optional().default(null),
    serialConfidence: z.number().min(0).max(1).nullable().optional().default(null),
    checklistHits: z
      .array(z.union([z.string(), z.number()]))
      .max(24)
      .optional()
      .default([])
      .transform((value) => sanitizeChecklistHits(value)),
    photoLabel: z
      .string()
      .max(80)
      .optional()
      .nullable()
      .transform((value) => {
        const trimmed = typeof value === "string" ? value.trim() : "";
        return trimmed || null;
      }),
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

function resolveAiChecklistHits(input: {
  checklistHits: DocumentationChecklistItemId[];
  suggestedCategory: IntakePhotoCategory | null;
  workerCategory: unknown;
}): DocumentationChecklistItemId[] {
  if (input.checklistHits.length > 0) return input.checklistHits;
  // Prefer AI category — never fall back to free-capture `other`, which used to
  // farm every phone photo onto overall_engine.
  if (input.suggestedCategory && input.suggestedCategory !== "other") {
    return [...checklistHitsForCategory(input.suggestedCategory)];
  }
  const worker = asIntakePhotoCategory(input.workerCategory);
  if (worker !== "other") return [...checklistHitsForCategory(worker)];
  return [];
}

const CATEGORY_GUIDE = [
  "Pick the single best suggestedCategory for THIS photo:",
  "- serial_plate / temporary_tag → stamped serial or hanging tag close-up",
  "- overview / overview_front / overview_rear / overview_left / overview_right → whole-engine exterior from that angle",
  "- overview_top / valve_cover → top of engine / valve cover / cams from above",
  "- oil_pan → underside / oil pan exterior",
  "- turbo / intake / exhaust → turbocharger or related plumbing",
  "- damage / harness / mounts / accessories → use those categories when that is the subject",
  "- If borescope/endoscope into a cylinder bore → category other + checklistHits cylinder_N (and oil_pan_removed / crankshaft_visible / connecting_rods when shown)",
  "- overall_engine checklist hit only when the frame shows most of the assembled engine block from outside",
  "Never mark every photo as overall_engine. Prefer specific sides/top/bottom/internals when visible.",
  "checklistHits: 1–4 item ids that this photo actually supports. Use only known ids.",
  "photoLabel: short human caption of what is in frame (e.g. 'Left side block', 'Valve cover', 'Cylinder 3 bore'). Required.",
  "Identity from the photo when readable:",
  "- suggestedIdentity.brandName: manufacturer cast/printed on the engine (Toyota, Hyundai, BMW, …)",
  "- suggestedIdentity.engineCode: family/code cast on block or cover (2AZ-FE, G4FC, N47, …)",
  "- suggestedIdentity.serialCode: only if a stamped serial is clearly readable",
  "- brandConfidence / engineCodeConfidence / serialConfidence: 0–1 for each field you fill",
  "- Only fill identity fields you can actually read or confidently recognize from casting marks — never invent",
  "hitConfidence: 0.55–0.95 grounded in what you see.",
  "oilPanRemoved=true only if the pan is off and internals are visible. hasTurbo=true/false when you can tell.",
].join("\n");

/** Apply AI identity only when confidence is high enough and the field is still empty. */
const IDENTITY_APPLY_MIN_CONFIDENCE = 0.7;

function normalizeIdentityToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || null;
}

function resolveIdentityPatch(input: {
  current: { serialCode?: string; brandName?: string; engineCode?: string } | undefined;
  suggested: {
    serialCode?: string;
    brandName?: string;
    engineCode?: string;
  };
  brandConfidence: number | null;
  engineCodeConfidence: number | null;
  serialConfidence: number | null;
}): {
  patch: Record<string, string>;
  applied: Array<"brandName" | "engineCode" | "serialCode">;
} {
  const patch: Record<string, string> = {};
  const applied: Array<"brandName" | "engineCode" | "serialCode"> = [];
  const current = input.current ?? {};

  const brand = normalizeIdentityToken(input.suggested.brandName);
  if (
    brand &&
    !current.brandName?.trim() &&
    (input.brandConfidence ?? 0) >= IDENTITY_APPLY_MIN_CONFIDENCE
  ) {
    patch.brandName = brand;
    applied.push("brandName");
  }

  const engineCode = normalizeIdentityToken(input.suggested.engineCode);
  if (
    engineCode &&
    !current.engineCode?.trim() &&
    (input.engineCodeConfidence ?? 0) >= IDENTITY_APPLY_MIN_CONFIDENCE
  ) {
    patch.engineCode = engineCode.toUpperCase();
    applied.push("engineCode");
  }

  const serial = normalizeIdentityToken(input.suggested.serialCode);
  if (
    serial &&
    !current.serialCode?.trim() &&
    (input.serialConfidence ?? 0) >= IDENTITY_APPLY_MIN_CONFIDENCE
  ) {
    patch.serialCode = serial.toUpperCase();
    applied.push("serialCode");
  }

  return { patch, applied };
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

  try {
    const identity =
      typeof job.expectedIdentity === "object" && job.expectedIdentity
        ? JSON.stringify(job.expectedIdentity)
        : "{}";
    const openSaleGates = Array.isArray(
      (job.documentationChecklist as DocumentationChecklist | undefined)?.items,
    )
      ? ((job.documentationChecklist as DocumentationChecklist).items ?? [])
          .filter(
            (item) =>
              item.saleGate &&
              (item.state === "missing" || item.state === "uncertain"),
          )
          .map((item) => item.id)
          .slice(0, 12)
      : [];

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
            "You are AutoCore's engine-intake vision matcher for auto dismantlers. Classify each photo into the documentation checklist. Be specific: sides, top, bottom, serial, turbo, or internals. When brand marks or engine codes are visible, report them with confidence scores. Do not invent identity. Do not dump unrelated shots onto overall_engine. Return JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Expected identity: ${identity}`,
                `Worker category hint (often "other"): ${String(photo.category ?? "other")}`,
                openSaleGates.length > 0
                  ? `Still open sale-gate items: ${openSaleGates.join(", ")}`
                  : "No open sale-gate items listed.",
                CATEGORY_GUIDE,
                `Known suggestedCategory values: ${INTAKE_PHOTO_CATEGORIES.join(", ")}`,
                `Known checklistHits ids: ${DOCUMENTATION_CHECKLIST_ITEM_IDS.join(", ")}`,
                "Return: suggestedCategory, photoLabel, suggestedIdentity, brandConfidence, engineCodeConfidence, serialConfidence, checklistHits, hitConfidence, hasTurbo, oilPanRemoved, cylinderCount, flags, listingReadinessScore.",
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

    const checklistHits = resolveAiChecklistHits({
      checklistHits: result.checklistHits,
      suggestedCategory: result.suggestedCategory,
      workerCategory: photo.category,
    });
    const hitConfidence =
      result.hitConfidence ?? (checklistHits.length > 0 ? 0.78 : 0.4);
    const nextCategory = asIntakePhotoCategory(
      result.suggestedCategory ?? photo.category,
    );
    const aiLabel =
      result.photoLabel ||
      (nextCategory !== "other" ? nextCategory.replaceAll("_", " ") : null);

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
      const currentIdentity =
        typeof freshJob.expectedIdentity === "object" && freshJob.expectedIdentity
          ? (freshJob.expectedIdentity as {
              serialCode?: string;
              brandName?: string;
              engineCode?: string;
            })
          : undefined;
      const identityResolved = resolveIdentityPatch({
        current: currentIdentity,
        suggested: result.suggestedIdentity ?? {},
        brandConfidence: result.brandConfidence,
        engineCodeConfidence: result.engineCodeConfidence,
        serialConfidence: result.serialConfidence,
      });
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
          suggestedCategory: result.suggestedCategory ?? nextCategory,
          photoLabel: aiLabel,
          suggestedIdentity: result.suggestedIdentity,
          brandConfidence: result.brandConfidence,
          engineCodeConfidence: result.engineCodeConfidence,
          serialConfidence: result.serialConfidence,
          identityApplied: identityResolved.applied,
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
        category: nextCategory,
        categorySource: result.suggestedCategory
          ? "ai"
          : typeof photo.categorySource === "string"
            ? photo.categorySource
            : "system",
        aiLabel,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const photosSnapshot = await transaction.get(jobRef.collection("photos"));
      const expectedIdentity = {
        ...(currentIdentity ?? {}),
        ...identityResolved.patch,
      };
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
        ...(identityResolved.applied.length > 0
          ? {
              expectedIdentity: {
                ...(typeof freshJob.expectedIdentity === "object"
                  ? freshJob.expectedIdentity
                  : {}),
                ...identityResolved.patch,
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
            identityApplied: identityResolved.applied,
            brandName: identityResolved.patch.brandName ?? null,
            engineCode: identityResolved.patch.engineCode ?? null,
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
          // Clear weak free-capture farming; manager can rematch or override.
          checklistHits: [],
          hitConfidence: null,
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
          checklistHits: [],
          hitConfidence: 0,
        },
      }).catch((reconcileError) => {
        console.error("[engine-intake/photo-ai] failure reconcile", reconcileError);
      }),
    ]);
  }
}
