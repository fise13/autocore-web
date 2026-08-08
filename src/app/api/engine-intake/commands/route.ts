import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { executeEngineIntakeCommand, EngineIntakeCommandError } from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import {
  EngineIntakeAccessError,
  type EngineIntakeCapability,
  verifyEngineIntakeAccess,
} from "@/lib/auth/verify-engine-intake-access.server";
import { parseEngineIntakeCommand } from "@/lib/engine-intake/engine-intake-schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

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

export async function POST(request: Request) {
  try {
    const command = parseEngineIntakeCommand(await request.json());
    const access = await verifyEngineIntakeAccess(request, requiredCapability(command));
    const result = await executeEngineIntakeCommand(access, command);
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
