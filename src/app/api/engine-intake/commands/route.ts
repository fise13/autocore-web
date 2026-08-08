import { after, NextResponse } from "next/server";
import { ZodError } from "zod";

import { executeEngineIntakeCommand, EngineIntakeCommandError } from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import { inspectEngineIntakePhoto } from "@/application/use-cases/engine-intake/inspect-intake-photo.server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  EngineIntakeAccessError,
  type EngineIntakeCapability,
  verifyEngineIntakeAccess,
} from "@/lib/auth/verify-engine-intake-access.server";
import { parseEngineIntakeCommand } from "@/lib/engine-intake/engine-intake-schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

function requiredCapability(
  command: ReturnType<typeof parseEngineIntakeCommand>,
): EngineIntakeCapability {
  if (command.type === "create_job") {
    return command.client === "mobile" && command.payload.source === "ad_hoc"
      ? "execute"
      : "verify";
  }
  if (
    command.type === "claim_job" ||
    command.type === "heartbeat_session" ||
    command.type === "pause_session" ||
    command.type === "resume_session" ||
    command.type === "cancel_session" ||
    command.type === "confirm_identity" ||
    command.type === "report_identity_mismatch" ||
    command.type === "set_location" ||
    command.type === "field_complete"
  ) {
    return "execute";
  }
  return "verify";
}

async function retryPendingPhotoInspections(input: {
  companyId: string;
  jobId: string;
  actorUid: string;
}): Promise<void> {
  const db = getAdminFirestore();
  const photos = await db
    .collection("companies")
    .doc(input.companyId)
    .collection("engineIntakeJobs")
    .doc(input.jobId)
    .collection("photos")
    .get();
  const pending = photos.docs
    .filter((doc) => {
      const data = doc.data();
      if (data.deletedAt != null) return false;
      if (data.syncState !== "synced" || typeof data.url !== "string") return false;
      const state = String(data.aiInspectionState ?? "queued");
      return state === "queued" || state === "failed";
    })
    .slice(0, 4);
  for (const photo of pending) {
    await inspectEngineIntakePhoto({
      companyId: input.companyId,
      jobId: input.jobId,
      photoId: photo.id,
      actorUid: input.actorUid,
    }).catch((error) => {
      console.error("[engine-intake/commands] photo-ai retry", photo.id, error);
    });
  }
}

export async function POST(request: Request) {
  try {
    const command = parseEngineIntakeCommand(await request.json());
    const access = await verifyEngineIntakeAccess(request, requiredCapability(command));
    const result = await executeEngineIntakeCommand(access, command);
    if (
      (command.type === "resume_session" ||
        command.type === "claim_job" ||
        command.type === "field_complete") &&
      "jobId" in command.payload &&
      typeof command.payload.jobId === "string"
    ) {
      const jobId = command.payload.jobId;
      after(() =>
        retryPendingPhotoInspections({
          companyId: access.companyId,
          jobId,
          actorUid: access.uid,
        }).catch((error) => {
          console.error("[engine-intake/commands] photo-ai batch", error);
        }),
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid engine intake command", issues: error.issues },
        { status: 400 },
      );
    }
    if (
      error instanceof EngineIntakeAccessError ||
      error instanceof EngineIntakeCommandError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[engine-intake/commands]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Engine intake command failed" },
      { status: 500 },
    );
  }
}
