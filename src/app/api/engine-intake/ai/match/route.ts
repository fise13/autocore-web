import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { inspectEngineIntakePhoto } from "@/application/use-cases/engine-intake/inspect-intake-photo.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  EngineIntakeAccessError,
  verifyEngineIntakeAccess,
} from "@/lib/auth/verify-engine-intake-access.server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z
  .object({
    jobId: z.string().trim().min(1).max(160),
    /** When true, re-run every synced photo (manager rematch). */
    force: z.boolean().optional().default(false),
  })
  .strict();

function photoNeedsMatch(data: Record<string, unknown>, force: boolean): boolean {
  if (data.deletedAt != null) return false;
  if (data.syncState !== "synced" || typeof data.url !== "string") return false;
  const state = String(data.aiInspectionState ?? "queued");
  if (state === "processing") return false;
  if (force) return true;
  if (state === "queued" || state === "failed" || !data.aiInspectionState) return true;
  // Weak prior pass: free-capture `other` that only farmed overall_engine.
  const category = typeof data.category === "string" ? data.category : "other";
  const hits = Array.isArray(data.checklistHits) ? data.checklistHits : [];
  if (category === "other" && hits.length === 0) return true;
  if (
    category === "other" &&
    hits.length > 0 &&
    hits.every((hit) => hit === "overall_engine")
  ) {
    return true;
  }
  return false;
}

async function listPhotosToMatch(input: {
  companyId: string;
  jobId: string;
  force: boolean;
}): Promise<string[]> {
  const db = getAdminFirestore();
  const photos = await db
    .collection("companies")
    .doc(input.companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId)
    .collection("photos")
    .get();
  return photos.docs
    .filter((doc) => photoNeedsMatch(doc.data() as Record<string, unknown>, input.force))
    .slice(0, 4)
    .map((doc) => doc.id);
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const access = await verifyEngineIntakeAccess(request, "verify");
    const photoIds = await listPhotosToMatch({
      companyId: access.companyId,
      jobId: input.jobId,
      force: input.force,
    });

    if (photoIds.length === 0) {
      return NextResponse.json({
        ok: true,
        queued: 0,
        matched: 0,
        failed: 0,
        photoIds: [] as string[],
      });
    }

    // Await matching in-request so Vercel does not drop background work and
    // the checklist updates before the manager looks away.
    let matched = 0;
    let failed = 0;
    for (const photoId of photoIds) {
      try {
        await inspectEngineIntakePhoto({
          companyId: access.companyId,
          jobId: input.jobId,
          photoId,
          actorUid: access.uid,
        });
        matched += 1;
      } catch (error) {
        failed += 1;
        console.error("[engine-intake/ai/match]", photoId, error);
      }
    }

    return NextResponse.json({
      ok: true,
      queued: photoIds.length,
      matched,
      failed,
      photoIds,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid AI match request", issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof EngineIntakeAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[engine-intake/ai/match]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not match intake photos" },
      { status: 500 },
    );
  }
}
