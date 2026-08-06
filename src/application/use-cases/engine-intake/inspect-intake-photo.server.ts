import "server-only";

import { INTAKE_PHOTO_CATEGORIES } from "@autocore/engine-intake";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  callOpenRouterJson,
  resolveOpenRouterModel,
} from "@/infrastructure/openrouter/chat-completions.server";

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
    suggestedCategory: z.enum(INTAKE_PHOTO_CATEGORIES).nullable(),
    suggestedIdentity: z
      .object({
        serialCode: z.string().max(240).optional(),
        brandName: z.string().max(240).optional(),
        engineCode: z.string().max(240).optional(),
        donorVin: z.string().max(32).optional(),
        configuration: z.string().max(500).optional(),
      })
      .strict(),
    flags: z
      .array(
        z
          .object({
            code: aiFlagCode,
            severity: z.enum(["info", "warning", "blocking"]),
            confidence: z.number().min(0).max(1),
            message: z.string().min(1).max(400),
          })
          .strict(),
      )
      .max(20),
    listingReadinessScore: z.number().min(0).max(100).nullable(),
  })
  .strict();

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
  const url = typeof photo.url === "string" ? photo.url : "";
  if (!url) return;

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
    const result = await callOpenRouterJson(
      [
        {
          role: "system",
          content:
            "You inspect automotive engine intake evidence. Return only grounded observations. Treat damage and identity as hypotheses, never certainty. A blocking flag is reserved for unusable or clearly wrong evidence.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Expected identity: ${identity}`,
                `Worker category: ${String(photo.category ?? "other")}`,
                "Inspect image quality, category, visible identity text, obvious damage or missing components, relevance, and marketplace usefulness.",
                "Return suggestedCategory, suggestedIdentity, flags, and listingReadinessScore.",
              ].join("\n"),
            },
            { type: "image_url", image_url: { url } },
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
      .map((flag) => ({ ...flag, photoId: input.photoId }));

    await db.runTransaction(async (transaction) => {
      const freshJobSnapshot = await transaction.get(jobRef);
      if (!freshJobSnapshot.exists) return;
      const currentBlockingFlags = Array.isArray(
        freshJobSnapshot.data()?.blockingAiFlags,
      )
        ? (freshJobSnapshot.data()?.blockingAiFlags as Array<{ photoId?: string }>)
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
          flags: result.flags,
          listingReadinessScore: result.listingReadinessScore,
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.update(photoRef, {
        aiInspectionState: "completed",
        ...(result.suggestedCategory && photo.category === "other"
          ? {
              category: result.suggestedCategory,
              categorySource: "ai",
            }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobRef, {
        blockingAiFlags: nextBlockingFlags,
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
            flagCodes: result.flags.map((flag) => flag.code),
            listingReadinessScore: result.listingReadinessScore,
          },
          clientAt: FieldValue.serverTimestamp(),
          serverAt: FieldValue.serverTimestamp(),
          idempotencyKey: `ai:${input.photoId}:${model}`,
        },
        { merge: true },
      );
    });
  } catch (error) {
    await Promise.all([
      inspectionRef.set(
        {
          state: "failed",
          error: error instanceof Error ? error.message.slice(0, 500) : "AI inspection failed",
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      photoRef.set(
        {
          aiInspectionState: "failed",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    ]);
  }
}
