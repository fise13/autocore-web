import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { executeEngineIntakeCommand, EngineIntakeCommandError } from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import {
  EngineIntakeAccessError,
  verifyEngineIntakeAccess,
} from "@/lib/auth/verify-engine-intake-access.server";
import { capabilityForEngineIntakeCommand } from "@/lib/engine-intake/command-capability";
import { parseEngineIntakeCommand } from "@/lib/engine-intake/engine-intake-schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const command = parseEngineIntakeCommand(await request.json());
    const access = await verifyEngineIntakeAccess(
      request,
      capabilityForEngineIntakeCommand(command),
    );
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
