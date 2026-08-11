import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  EngineIntakeCommandError,
} from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import { finalizeIntakePhoto } from "@/application/use-cases/engine-intake/intake-photo.server";
import {
  EngineIntakeAccessError,
  verifyEngineIntakeAccess,
} from "@/lib/auth/verify-engine-intake-access.server";
import { parseFinalizeIntakePhotoRequest } from "@/lib/engine-intake/engine-intake-schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const input = parseFinalizeIntakePhotoRequest(await request.json());
    const access = await verifyEngineIntakeAccess(request, "execute");
    const result = await finalizeIntakePhoto(access, input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid intake photo finalization", issues: error.issues },
        { status: 400 },
      );
    }
    if (
      error instanceof EngineIntakeAccessError ||
      error instanceof EngineIntakeCommandError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[engine-intake/photos/finalize]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not finalize intake photo" },
      { status: 500 },
    );
  }
}
