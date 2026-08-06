import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  EngineIntakeCommandError,
} from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import { prepareIntakePhoto } from "@/application/use-cases/engine-intake/intake-photo.server";
import {
  EngineIntakeAccessError,
  verifyEngineIntakeAccess,
} from "@/lib/auth/verify-engine-intake-access.server";
import { parsePrepareIntakePhotoRequest } from "@/lib/engine-intake/engine-intake-schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const input = parsePrepareIntakePhotoRequest(await request.json());
    const access = await verifyEngineIntakeAccess(request, "execute");
    return NextResponse.json(await prepareIntakePhoto(access, input));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid intake photo", issues: error.issues },
        { status: 400 },
      );
    }
    if (
      error instanceof EngineIntakeAccessError ||
      error instanceof EngineIntakeCommandError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[engine-intake/photos/prepare]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare intake photo" },
      { status: 500 },
    );
  }
}
