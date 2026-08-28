import { NextResponse } from "next/server";

import { EngineIntakeCommandError } from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import { autoFinalizeIntakePhotoFromStorage } from "@/application/use-cases/engine-intake/intake-photo.server";
import { parseIntakePhotoStoragePath } from "@/lib/engine-intake/intake-photo-storage-path";
import { isIntakePhotoWorkerRequest } from "@/lib/engine-intake/intake-photo-worker-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Finalize a photo whose bytes reached Storage after the app was gone.
 *
 * Called only by the Firebase Storage trigger, never by a device. The device
 * still finalizes its own uploads while it is alive; this is what closes the
 * gap between "the background URLSession delivered the object" and "the
 * business can see the engine", which used to stay open until the worker next
 * opened the app.
 */
export async function POST(request: Request) {
  if (!isIntakePhotoWorkerRequest(request)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  let storagePath = "";
  try {
    const body = (await request.json()) as { storagePath?: unknown };
    storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ref = parseIntakePhotoStoragePath(storagePath);
  if (!ref) {
    return NextResponse.json({ error: "Not an intake photo object" }, { status: 400 });
  }

  try {
    const result = await autoFinalizeIntakePhotoFromStorage({
      companyId: ref.companyId,
      jobId: ref.jobId,
      photoId: ref.photoId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EngineIntakeCommandError) {
      // A conflict here means somebody else already closed the photo, or the
      // row moved on. Either way the trigger must not retry forever.
      return NextResponse.json({ status: "skipped", reason: error.message });
    }
    console.error("[engine-intake/photos/auto-finalize]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not finalize intake photo",
      },
      { status: 500 },
    );
  }
}
