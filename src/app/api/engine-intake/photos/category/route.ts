import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import {
  EngineIntakeCommandError,
} from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import { setIntakePhotoCategory } from "@/application/use-cases/engine-intake/intake-photo.server";
import {
  EngineIntakeAccessError,
  verifyEngineIntakeAccess,
} from "@/lib/auth/verify-engine-intake-access.server";
import { INTAKE_PHOTO_CATEGORIES } from "@autocore/engine-intake";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z
  .object({
    jobId: z.string().trim().min(1).max(160),
    photoId: z.string().trim().min(1).max(160),
    category: z.enum(INTAKE_PHOTO_CATEGORIES),
    aiLabel: z.string().trim().max(80).nullable().optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const access = await verifyEngineIntakeAccess(request, "verify");
    const result = await setIntakePhotoCategory(access, input);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid photo category update", issues: error.issues },
        { status: 400 },
      );
    }
    if (
      error instanceof EngineIntakeAccessError ||
      error instanceof EngineIntakeCommandError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[engine-intake/photos/category]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update photo category" },
      { status: 500 },
    );
  }
}
